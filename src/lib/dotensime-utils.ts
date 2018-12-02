import * as glob from 'glob'
import * as _ from 'lodash'
import {readFile} from './file-utils'
import * as lisp from './lisp/lisp'
import * as swankExtras from './lisp/swank-extras'
import {DotEnsime} from './types'

const sexpToJObject = swankExtras.sexpToJObject

async function readDotEnsime(path: string): Promise<string> {
    return readFile(path).then(raw => {
        const rows = raw.toString().split(new RegExp('\r?\n'))
        const filtered = rows.filter(l => l.indexOf(';;') !== 0)
        return filtered.join('\n')
    })
}

export async function parseDotEnsime(path: string): Promise<DotEnsime> {
    // scala version from .ensime config file of project
    const dotEnsime = readDotEnsime(path)

    const dotEnsimeLisp = lisp.readFromString(dotEnsime)
    const dotEnsimeJs = sexpToJObject(dotEnsimeLisp)
    const subprojects = dotEnsimeJs[':subprojects']
    const sourceRoots = _.flattenDeep(subprojects.map((sp: any) => sp[':source-roots']))
    const scalaVersion = dotEnsimeJs[':scala-version']
    const scalaEdition = scalaVersion.substring(0, 4)

    return {
        name: dotEnsimeJs[':name'] as string,
        scalaVersion: scalaVersion as string,
        scalaEdition: scalaEdition as string,
        javaHome: dotEnsimeJs[':java-home'] as string,
        javaFlags: dotEnsimeJs[':java-flags'] as string,
        rootDir: dotEnsimeJs[':root-dir'] as string,
        cacheDir: dotEnsimeJs[':cache-dir'] as string,
        compilerJars: dotEnsimeJs[':scala-compiler-jars'] as string,
        dotEnsimePath: path as string,
        sourceRoots: sourceRoots as [string],
        serverJars: dotEnsimeJs[':ensime-server-jars'],
    }
}

// Gives promise of .ensime paths
export async function allDotEnsimesInPaths(paths: [string]): Promise<Array<{ path: string }>> {
    const dotEnsimesUnflattened = await Promise.all(paths.map(dir => {
        return globAsync(
            '.ensime', {
                cwd: dir,
                ignore: '**/{node_modules,.ensime_cache,.git,target,.idea}/**',
                matchBase: true,
                nodir: true,
                realpath: true,
            })
    }))
    return _.flattenDeep<string>(dotEnsimesUnflattened).map(path => ({ path }))
}

export function dotEnsimesFilter(path: string, stats: { isDirectory: () => boolean }): boolean {
    return !stats.isDirectory() && !_.endsWith(path, '.ensime')
}
async function globAsync(pattern: string, options: glob.IOptions): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
        glob(pattern, options, (err, matches) => err ? reject(err) : resolve(matches))
    })
}
