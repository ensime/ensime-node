import {DotEnsime} from '../types';
import {startServerFromClasspath} from './server-startup-utils';
import * as Promise from 'bluebird';
import {ChildProcess} from 'child_process';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as loglevel from 'loglevel';
import * as path from 'path';

const log = loglevel.getLogger('ensime.startup');

// Start ensime server from given classpath file
export function startServerFromFile(
    classpathFile: string,
    dotEnsime: DotEnsime,
    ensimeServerVersion: string, ensimeServerFlags = '',
): PromiseLike<ChildProcess> {
    log.debug('starting server from file');
    return new Promise<ChildProcess>((resolve, reject) => {
        fs.readFile(classpathFile, { encoding: 'utf8' }, (err, classpathFileContents) => {
            if (err) {
                reject(err);
            }
            const classpathList = _.split(classpathFileContents, path.delimiter);
            const pid = startServerFromClasspath(classpathList, dotEnsime, ensimeServerVersion, ensimeServerFlags);
            pid.then(resolve);
        });
    });
}

export function startServerFromAssemblyJar(assemblyJar: string, dotEnsime: DotEnsime, ensimeServerVersion: string = '1.0.0', ensimeServerFlags = '') {
    const cp = [assemblyJar].concat(dotEnsime.compilerJars);
    return startServerFromClasspath(cp, dotEnsime, ensimeServerVersion, ensimeServerFlags);
}
