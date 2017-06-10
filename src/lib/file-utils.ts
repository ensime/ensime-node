import * as Promise from 'bluebird'
import * as fs from 'fs-extra'
import * as loglevel from 'loglevel'

const log = loglevel.getLogger('ensime.startup')

/**
 * Promisified file io
 */
export const writeFile: (f: string, data: any) => PromiseLike<void> = fs.writeFile
export const readFile: (f: string) => PromiseLike<Buffer> = fs.readFile

export function ensureExistsDir(path: string): PromiseLike<void> {
    log.trace('ensureExistsDir called on path', path)
    return fs.ensureDir(path).catch(err => log.debug(err))
}
