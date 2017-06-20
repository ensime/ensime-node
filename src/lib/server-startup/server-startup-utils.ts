import {ensureExistsDir} from '../file-utils'
import {DotEnsime} from '../types'
import path = require('path')
import {spawn, ChildProcess} from 'child_process'
import loglevel = require('loglevel')
import fs = require('fs')
import * as stream from 'stream'
const log = loglevel.getLogger('server-startup')

class EchoStream extends stream.Writable {
  private logger: (...msg: any[]) => void

  constructor(logger: (...msg: any[]) => void) {
    super()
    this.logger = logger
  }

  public _write(chunk: any, encoding: string, next: () => void) {
    this.logger(chunk.toString())
    next()
  }
}

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

function execEnsime(dotEnsime: DotEnsime, cmd: string, args: string[]): PromiseLike<ChildProcess> {
  const serverLog = fs.createWriteStream(path.join(dotEnsime.cacheDir, 'server.log'))
  const child = spawn(cmd, args)

  let errorMsg
  child.stderr.on('data', data => {
    errorMsg += String.fromCharCode.apply(null, data)
  })

  child.stdout.pipe(serverLog)
  child.stdout.pipe(new EchoStream(log.info))
  child.stderr.pipe(serverLog)
  child.stderr.pipe(new EchoStream(log.error))

  return new Promise((resolve, reject) => {
    // Wait 5s to check that the process didn't die
    setTimeout(() => resolve(child), 5000)
    child.on('error', err => {
      reject(new Error(`Failed to start '${cmd} ${args.join(' ')}': ${err}`))
    })
    child.on('exit', () => {
      reject(new Error(`Fail to run '${cmd} ${args.join(' ')}': ${errorMsg || '<none>'}`))
    })
  })
}

export function startServerFromClasspath(classpath: string[], dotEnsime: DotEnsime, serverFlags = ''): PromiseLike<ChildProcess> {
  const cmd = javaCmdOf(dotEnsime)

  const args = javaArgsOf(classpath, dotEnsime.dotEnsimePath, serverFlags)
  log.debug(`Starting Ensime server with ${cmd} ${args.join(' ')}`)

  return ensureExistsDir(dotEnsime.cacheDir).then(() => execEnsime(dotEnsime, cmd, args))
}
