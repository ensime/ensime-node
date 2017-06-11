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
    ensimeServerFlags = ''
): PromiseLike<ChildProcess> {
    log.info('Starting server from classpath')
    return startServerFromClasspath(dotEnsime.serverJars.concat(dotEnsime.compilerJars), dotEnsime, ensimeServerFlags)
}

export function startServerFromAssemblyJar(
    assemblyJar: string,
    dotEnsime: DotEnsime,
    ensimeServerFlags = ''): PromiseLike<ChildProcess> {
    const cp = [assemblyJar].concat(dotEnsime.compilerJars)
    log.info('Starting server from assembly jar')
    return startServerFromClasspath(cp, dotEnsime, ensimeServerFlags)
}
