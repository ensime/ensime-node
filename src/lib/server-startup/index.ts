import * as Promise from 'bluebird'
import {ChildProcess} from 'child_process'
import * as fs from 'fs'
import * as _ from 'lodash'
import * as loglevel from 'loglevel'
import * as path from 'path'
import {DotEnsime} from '../types'
import {startServerFromClasspath} from './server-startup-utils'

const log = loglevel.getLogger('ensime.startup')

// Start ensime server from given classpath file
export function startServerFromDotEnsimeCP(
    dotEnsime: DotEnsime,
    ensimeServerVersion: string, ensimeServerFlags = ''
): PromiseLike<ChildProcess> {
    log.debug('starting server from file')
    return new Promise<ChildProcess>((resolve, reject) => {
            const pid = startServerFromClasspath(dotEnsime.serverJars.concat(dotEnsime.compilerJars), dotEnsime, ensimeServerFlags)
            pid.then(resolve)
        })
}

export function startServerFromAssemblyJar(assemblyJar: string, dotEnsime: DotEnsime, ensimeServerFlags = '') {
    const cp = [assemblyJar].concat(dotEnsime.compilerJars)
    return startServerFromClasspath(cp, dotEnsime, ensimeServerFlags)
}
