import * as fs from 'fs-extra'
import * as loglevel from 'loglevel'

const log = loglevel.getLogger('ensime.startup')

/**
 * Promisified file io
 */
export const writeFile: (f: string, data: any) => Promise<void> = fs.writeFile
export const readFile: (f: string) => Promise<Buffer> = fs.readFile

export async function ensureExistsDir(path: string): Promise<void> {
    log.trace('ensureExistsDir called on path', path)
    return fs.ensureDir(path).catch(err => log.debug(err))
}
