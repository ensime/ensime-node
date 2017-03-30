import {ensureExists} from '../file-utils'
import {DotEnsime} from '../types'
import path = require('path')
import _ = require('lodash')
import * as Promise from 'bluebird'
import {spawn, ChildProcess} from 'child_process'
import loglevel = require('loglevel')
import fs = require('fs')
const log = loglevel.getLogger('server-startup')

/**
 *  Make an array of java command line args for spawn
 */
function javaArgsOf(classpath: string[], dotEnsimePath: string, ensimeServerFlags = ''): string[] {
  const args = ['-classpath', classpath.join(path.delimiter) , `-Densime.config=${dotEnsimePath}`]

  if (ensimeServerFlags) {
    args.push(ensimeServerFlags) // ## Weird, but extra " " broke everyting
  }

  args.push('org.ensime.server.Server')
  return args
}

export function javaCmdOf(dotEnsime: DotEnsime) {
    return path.join(dotEnsime.javaHome, 'bin', 'java')
}

function logServer(pid, cacheDir) {
    fs.exists(cacheDir, exists => {
        if (exists) {
            const serverLog = fs.createWriteStream(path.join(cacheDir, 'server.log'))
            pid.stdout.pipe(serverLog)
            pid.stderr.pipe(serverLog)
            return pid.stdin.end()
        } else {
            fs.mkdir(cacheDir, err => {
                return logServer(pid, cacheDir)
            })
        }
    })
}

export function startServerFromClasspath(classpath: string[], dotEnsime: DotEnsime, serverFlags = ''): PromiseLike<ChildProcess> {
  return new Promise<ChildProcess>((resolve, reject) => {
    const cmd = javaCmdOf(dotEnsime)

    const args = javaArgsOf(classpath, dotEnsime.dotEnsimePath, serverFlags)
    log.debug(`Starting Ensime server with ${cmd} ${_.join(args, ' ')}`)

    ensureExists(dotEnsime.cacheDir).then( () => {
      const pid = spawn(cmd, args)
      logServer(pid, dotEnsime.cacheDir)
      resolve(pid)
    })
  })
}
