// import * as Promise from 'bluebird'
import * as fs from 'fs-extra'
import * as path from 'path'

import { readFile, writeFile } from '../lib/file-utils'

import * as loglevel from 'loglevel'
import * as temp from 'temp'

import {
    clientStarterFromServerStarter,
    dotEnsimeUtils,
    pid,
    startServerFromAssemblyJar,
    startServerFromDotEnsimeCP,
    DotEnsime,
    ServerStarter,
} from '../lib/index'
import {apiOf, Api} from '../lib/server-api/server-api'
import {ServerConnection} from '../lib/server-api/server-connection'
import {Event} from '../lib/server-api/server-protocol'

import {spawn} from 'child_process'

loglevel.setDefaultLevel(LogLevel.TRACE)
loglevel.setLevel('trace')
const log = loglevel.getLogger('spec-utils')

temp.track()

export class ProjectRef {
    public readonly path: string
    public readonly connection: ServerConnection
    public readonly api: Api

    constructor(path: string, connection: ServerConnection) {
        this.connection = connection
        this.path = path
        this.api = apiOf(connection)
    }

    public addFiles(files: { [path: string]: string}): Promise<{}> {
        return Promise.all(
            Object.keys(files).map(basePath => writeFile(this.pathOf(basePath), files[basePath]))
        )
    }

    public pathOf(relativePath: string): string {
        return path.join(this.path, relativePath)
    }

    public clean() {
        log.debug(`Cleaning ${path} project`)
        temp.cleanupSync()
        return this.connection.destroy()
    }
}

export async function setupProject(): Promise<ProjectRef> {
    const projectPath = temp.mkdirSync('ensime-integration-test')
    await generateProject(projectPath)
    await genDotEnsime(projectPath)

    const dotEnsimePath = path.join(projectPath, '.ensime')

    await fs.pathExists(dotEnsimePath)

    const connection: ServerConnection = await startEnsime(dotEnsimePath).then(c => {
        log.debug('got a connected client', c)
        return c
    })

    return new ProjectRef(projectPath, connection)
}

/**
 * Generates project structure and build.sbt
 */
async function generateProject(dir: string) {
    await fs.ensureDir(path.join(dir, 'project'))
    await fs.ensureDir(path.join(dir, 'src', 'main', 'scala'))

    const buildDotSbt = `
        import org.ensime.EnsimeKeys._
        ensimeServerVersion in ThisBuild := "2.0.0-M1"
        ensimeProjectServerVersion in ThisBuild := "2.0.0-M1"


        lazy val commonSettings = Seq(
            organization := "org.ensime",
            version := "0.1-SNAPSHOT",
            scalaVersion := "2.11.8"
        )

        lazy val root = (project in file(".")).
            settings(commonSettings: _*).
            settings(
                name := "ensime-test-project"
            )
    `

    const buildSbtP = await writeFile(path.join(dir, 'build.sbt'), buildDotSbt)

    const pluginsSbtP = await writeFile(path.join(dir, 'project', 'plugins.sbt'),
        `addSbtPlugin("org.ensime" % "sbt-ensime" % "1.12.12")`)

    return await fs.pathExists(path.join(dir, 'build.sbt'))
}

/**
 * Calls sbt ensimeConfig to generate .ensime
 */
function genDotEnsime(dir: string) {
    const pid = spawn('sbt', ['ensimeConfig'], {cwd: dir})

    pid.stdin.end()

    pid.stdout.on('data', chunk => {
        log.info('ensimeConfig', chunk.toString('utf8'))
    })

    return new Promise((resolve, reject) => {
        pid.on('close', (exitCode: number) => {
            if (exitCode === 0) {
                resolve(exitCode)
            } else {
                reject(exitCode)
            }
        })
    })
}

function startEnsime(dotEnsimePath: string, serverVersion: string = '2.0.0-M1'): PromiseLike<ServerConnection> {
    return dotEnsimeUtils.parseDotEnsime(dotEnsimePath).then(dotEnsime => {
        log.debug('got a parsed .ensime')
        const assemblyJar = process.env.ENSIME_ASSEMBLY_JAR
        let serverStarter: ServerStarter

        if (!assemblyJar) {
            serverStarter = (project: DotEnsime) => startServerFromDotEnsimeCP(project)
        } else {
            serverStarter = (project: DotEnsime) => startServerFromAssemblyJar(assemblyJar, project)
        }

        return clientStarterFromServerStarter(serverStarter)(dotEnsime, serverVersion)
    })
}

export function expectEvents(api: Api, events: [Event]): PromiseLike<{}>   {
    return new Promise((resolve, reject) => {
        let evIdx: number = 0
        api.onEvents(event => {
            if (evIdx >= events.length) {
                return
            }
            expect(event).toEqual(events[evIdx++])
            if (evIdx >= events.length) {
                resolve(events)
            }
        })
    })
}
