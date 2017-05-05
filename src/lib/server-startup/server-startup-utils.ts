import {ensureExists} from '../file-utils'
import {DotEnsime} from '../types'
import path = require('path')
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

function execEnsime(cmd: string, args: string[]): PromiseLike<ChildProcess> {
  const child = spawn(cmd, args)
  let errorMsg = '<none>'
  child.stderr.on('data', data => {
    errorMsg = String.fromCharCode.apply(null, data)
  })

  return new Promise((resolve, reject) => {
    // Wait 5s to check that the process didn't die
    setTimeout(() => resolve(child), 5000)
    child.on('error', err => {
      reject(new Error(`Failed to start '${cmd} ${args.join(' ')}': ${err}`))
    })
    child.on('exit', () => {
      reject(new Error(`Fail to run '${cmd} ${args.join(' ')}': ${errorMsg}`))
    })
  })
}

export function startServerFromClasspath(classpath: string[], dotEnsime: DotEnsime, serverFlags = ''): PromiseLike<ChildProcess> {
  const cmd = javaCmdOf(dotEnsime)

  const args = javaArgsOf(classpath, dotEnsime.dotEnsimePath, serverFlags)
  log.debug(`Starting Ensime server with ${cmd} ${args.join(' ')}`)

  const proc = ensureExists(dotEnsime.cacheDir).then(() => execEnsime(cmd, args))

  proc.then(p => logServer(p, dotEnsime.cacheDir))

  return proc
}
