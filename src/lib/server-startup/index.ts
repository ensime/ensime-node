import {ChildProcess} from 'child_process'
import * as loglevel from 'loglevel'
import {DotEnsime} from '../types'
import {startServerFromClasspath} from './server-startup-utils'

const log = loglevel.getLogger('ensime.startup')

/**
 * Start ensime server from given classpath file
 */
export async function startServerFromDotEnsimeCP(dotEnsime: DotEnsime, ensimeServerFlags: string = ''): Promise<ChildProcess> {
    log.info('Starting server from classpath')
    return startServerFromClasspath(dotEnsime.serverJars.concat(dotEnsime.compilerJars), dotEnsime, ensimeServerFlags)
}

export async function startServerFromAssemblyJar(assemblyJar: string, dotEnsime: DotEnsime, ensimeServerFlags: string = ''): Promise<ChildProcess> {
    const cp = [assemblyJar].concat(dotEnsime.compilerJars);
    log.info('Starting server from assembly jar');
    return startServerFromClasspath(cp, dotEnsime, ensimeServerFlags);
}
