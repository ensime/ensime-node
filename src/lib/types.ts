import {ChildProcess} from 'child_process';
export type pid = string;
export import serverProtocol = require('./server-api/server-protocol');

export interface ServerStarter {
    (project: DotEnsime): PromiseLike<ChildProcess>;
}

export interface ServerSettings {
    persistentFileArea: string;
    notifier?: () => any;
    serverVersion?: string;
}

export interface ProxySettings {
    host: string;
    port: number;
    user?: string;
    password?: string;
}

export class DotEnsime {
    name: string
    scalaVersion: string
    scalaEdition: string
    javaHome: string
    javaFlags: string
    rootDir: string
    cacheDir: string
    compilerJars: string
    dotEnsimePath: string
    sourceRoots: [string]
    serverJars: [string]
}
