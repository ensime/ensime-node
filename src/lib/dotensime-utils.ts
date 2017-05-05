import {readFile} from './file-utils'
import lisp = require('./lisp/lisp')
import {DotEnsime} from './types'
import _ = require('lodash')
import * as Promise from 'bluebird'
import glob = require('glob')
import swankExtras = require('./lisp/swank-extras')

const sexpToJObject = swankExtras.sexpToJObject

function readDotEnsime(path: string): PromiseLike<string> {

    return readFile(path).then(raw => {
        const rows = raw.toString().split(new RegExp('\r?\n'))
        const filtered = rows.filter(l => l.indexOf(';;') !== 0)
        return filtered.join('\n')
    })
}

export function parseDotEnsime(path: string): PromiseLike<DotEnsime> {
    // scala version from .ensime config file of project
    return readDotEnsime(path).then(dotEnsime => {

        const dotEnsimeLisp = lisp.readFromString(dotEnsime)
        const dotEnsimeJs = sexpToJObject(dotEnsimeLisp)
        const subprojects = dotEnsimeJs[':subprojects']
        const sourceRoots = _.flattenDeep(subprojects.map(sp => sp[':source-roots']))
        const scalaVersion = dotEnsimeJs[':scala-version']
        const scalaEdition = scalaVersion.substring(0, 4)

        return {
            name: dotEnsimeJs[':name'] as string,
            scalaVersion:  scalaVersion as string,
            scalaEdition: scalaEdition as string,
            javaHome:  dotEnsimeJs[':java-home'] as string,
            javaFlags: dotEnsimeJs[':java-flags'] as string,
            rootDir: dotEnsimeJs[':root-dir'] as string,
            cacheDir: dotEnsimeJs[':cache-dir'] as string,
            compilerJars: dotEnsimeJs[':scala-compiler-jars'] as string,
            dotEnsimePath: path as string,
            sourceRoots: sourceRoots as [string],
            serverJars: dotEnsimeJs[':ensime-server-jars'],
        } as DotEnsime
    })
}

// Gives promise of .ensime paths
export function allDotEnsimesInPaths(paths: [string]): PromiseLike<Array<{ path: string }>> {
    const globTask = Promise.promisify<[string], string, {}>(glob)
    const promises = paths.map(dir =>
        globTask(
            '.ensime', {
                cwd: dir,
                ignore: '**/{node_modules,.ensime_cache,.git,target,.idea}/**',
                matchBase: true,
                nodir: true,
                realpath: true,
            })
    )
    const promise = Promise.all(promises)
    const result = promise.then(dotEnsimesUnflattened => {
        const thang = _.flattenDeep<string>(dotEnsimesUnflattened)
        function toObj(path: string) {
            return { path: path as string }
        }
        return thang.map(toObj)
    })
    return result
}

export function dotEnsimesFilter(path: string, stats: any) {
    return !stats.isDirectory() && !_.endsWith(path, '.ensime')
}
