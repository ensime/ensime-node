import fs = require('fs');
import path = require('path');
import * as Promise from 'bluebird';

import {spawn} from 'child_process';
import _ = require('lodash');
import loglevel = require('loglevel');
import {DotEnsime, ProxySettings} from './types';
const download = require('download');
import {ensureExists} from './file-utils'

function proxyArgs(proxySettings?: ProxySettings) {
  const args = []
  if (proxySettings != undefined) {
    args.push('-Dhttp.proxyHost=' + proxySettings.host);
    args.push('-Dhttps.proxyHost=' + proxySettings.host);
    args.push('-Dhttp.proxyPort=' + proxySettings.port);
    args.push('-Dhttps.proxyPort=' + proxySettings.port);
    if (proxySettings.user != undefined) {
      args.push('-Dhttp.proxyUser=' + proxySettings.user);
      args.push('-Dhttps.proxyUser=' + proxySettings.user);
    }
    if (proxySettings.password != undefined) {
      args.push('-Dhttp.proxyPassword=' + proxySettings.password);
      args.push('-Dhttps.proxyPassword=' + proxySettings.password);
    }
    return args
  }
}

function javaArgs(dotEnsime: DotEnsime, serverVersion: String, updateChanging: boolean) {
  const scalaVersion = dotEnsime.scalaVersion
  const scalaEdition = dotEnsime.scalaEdition
  const args =
    [
      '-noverify', // https://github.com/alexarchambault/coursier/issues/176#issuecomment-188772685
      '-jar', './coursier',
      'fetch'
    ]
  if (updateChanging) {
    args.push('-m', 'update-changing');
  }
  args.push(
    '-r', 'file:///$HOME/.m2/repository',
    '-r', 'https://oss.sonatype.org/content/repositories/snapshots',
    '-r', 'https://jcenter.bintray.com/',
    `org.ensime:ensime_${scalaEdition}:${serverVersion}`,
    '-V', `org.scala-lang:scala-compiler:${scalaVersion}`,
    '-V', `org.scala-lang:scala-library:${scalaVersion}`,
    '-V', `org.scala-lang:scala-reflect:${scalaVersion}`,
    '-V', `org.scala-lang:scalap:${scalaVersion}`
  );
}

// Updates ensime server, invoke callback when done
export default function updateServer(tempdir: string, failure: (string, int) => void, getPidLogger: () => (string) => void, proxySettings?:ProxySettings) {
  const logger = loglevel.getLogger('ensime.server-update')
  logger.debug('update ensime server, tempdir: ' + tempdir)

  return function doUpdateServer(parsedDotEnsime: DotEnsime, ensimeServerVersion: string, classpathFile: string): PromiseLike<any> {
    logger.debug('trying to update server with coursier…')

    return ensureExists(parsedDotEnsime.cacheDir).then((cacheDir) => {


      console.log('cachedir: ', cacheDir)
      return new Promise((resolve, reject) => {
        function runCoursier() {
          const javaCmd = (parsedDotEnsime.javaHome) ?
            path.join(parsedDotEnsime.javaHome, 'bin', 'java')
            :
            "java"

          let spaceSeparatedClassPath = ""

          const args = proxyArgs(proxySettings).concat(javaArgs(parsedDotEnsime, ensimeServerVersion, true))

          logger.debug('java command to spawn', javaCmd, args, tempdir)
          const pid = spawn(javaCmd, args, { cwd: tempdir })
          const pidLogger = getPidLogger()
          pid.stdout.on('data', (chunk) => {
            const s = chunk.toString('utf8')
            logger.debug('got data from java process', s)
            if(pidLogger) pidLogger(s)
            spaceSeparatedClassPath += chunk.toString('utf8')
          })
          pid.stderr.on('data', (chunk) => {
            const s = chunk.toString('utf8')
            logger.debug('coursier: ', s)
            if(pidLogger) pidLogger(s)
          })

          pid.stdin.end()

          pid.on('close', (exitCode) => {
            if (exitCode == 0) {
              const classpath = _.join(_.split(_.trim(spaceSeparatedClassPath), /\s/), path.delimiter)
              logger.debug['classpath', classpath]
              fs.writeFile(classpathFile, classpath, resolve)
            } else {
              logger.error('Ensime server update failed, exitCode: ', exitCode)
              failure("Ensime server update failed", exitCode)
              reject(exitCode)
            }
          });
        }

        logger.debug("checking tempdir: " + tempdir)
        if (!fs.existsSync(tempdir))  {
          logger.debug("tempdir didn't exist, creating: " + tempdir)
          fs.mkdirSync(tempdir)
        }

        if (fs.existsSync(tempdir + path.sep + 'coursier')) {
          logger.debug("pre-existing coursier binary, downloading: " + tempdir)
          runCoursier()
        } else {
          logger.trace("no pre-existing coursier binary, downloading: " + tempdir)
          const coursierUrl = 'https://git.io/vgvpD' // Java 7

          download({ mode: '0755' }).get(coursierUrl).dest(tempdir).rename('coursier').run((err) => {
            if (err) {
              logger.error("failed to download coursier")
              failure("Failed to download coursier", err)
              reject(err)
            } else {
              logger.debug("downloaded coursier, now running:")
              runCoursier()
            }
          });
        }
      });
    });
  }
}
