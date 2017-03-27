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
export function javaArgsOf(dotEnsime: DotEnsime, ensimeServerFlags = ''): string[] {
  const args = ['-classpath', dotEnsime.serverJars.join(path.sep), `-Densime.config=${dotEnsime.dotEnsimePath}`]

  if (ensimeServerFlags) {
    args.push(ensimeServerFlags) // ## Weird, but extra " " broke everyting
  }

  args.push('org.ensime.server.Server')
  return args
}

export function javaCmdOf(dotEnsime: DotEnsime) {
    return path.join(dotEnsime.javaHome, 'bin', 'java')
}

function spawnServer(javaCmd: string, args: string[], detached = false) {
    return spawn(javaCmd, args, { detached })
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

export function startServerFromClasspath(classpath: string[], dotEnsime: DotEnsime, serverVersion: string, serverFlags = ''): PromiseLike<ChildProcess> {
  return new Promise<ChildProcess>((resolve, reject) => {
    const cmd = javaCmdOf(dotEnsime)
    const args = javaArgsOf(dotEnsime, serverFlags)
    log.debug(`Starting Ensime server with ${cmd} ${_.join(args, ' ')}`)

    ensureExists(dotEnsime.cacheDir).then( () => {
      const pid = spawnServer(cmd, args)
      logServer(pid, dotEnsime.cacheDir)
      resolve(pid)
    })
  })
}
