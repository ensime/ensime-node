import * as fs from 'fs-extra'
import * as path from 'path'

import { writeFile } from '../lib/file-utils'

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
import {makeInstanceFromPath, EnsimeInstance, UI} from '../lib/instance'
import {apiOf, Api} from '../lib/server-api/server-api'
import {ServerConnection} from '../lib/server-api/server-connection'
import {Event} from '../lib/server-api/server-protocol'

import {spawn} from 'child_process'

const log = loglevel.getLogger('spec-utils')

temp.track()

class CleanUpFakeUI implements UI {
    private projectPath: string
    constructor(projectPath: string) {
        this.projectPath = projectPath
    }
    public destroy(): void {
        log.debug(`Cleaning ${this.projectPath} project`)
        temp.cleanupSync()
    }
}

export async function setupProject(): Promise<EnsimeInstance<any>> {
    const projectPath = temp.mkdirSync('ensime-integration-test')
    await generateProject(projectPath)
    await genDotEnsime(projectPath)

    const dotEnsimePath = path.join(projectPath, '.ensime')

    await fs.pathExists(dotEnsimePath)

    const connection: ServerConnection = await startEnsime(dotEnsimePath)
    log.debug('Got a connected client', connection)

    return await makeInstanceFromPath(dotEnsimePath, connection, new CleanUpFakeUI(projectPath))
}

/**
 * Generates project structure and build.sbt
 */
async function generateProject(dir: string, scalaVersion: string = '2.11.11', ensimeServerVersion: string = '2.0.0-M1'): Promise<boolean> {
    await fs.ensureDir(path.join(dir, 'project'))
    await fs.ensureDir(path.join(dir, 'src', 'main', 'scala'))

    const buildDotSbt = `
        import org.ensime.EnsimeKeys._
        ensimeServerVersion in ThisBuild := "${ensimeServerVersion}"
        ensimeProjectServerVersion in ThisBuild := "${ensimeServerVersion}"


        lazy val commonSettings = Seq(
            organization := "org.ensime",
            version := "0.1-SNAPSHOT",
            scalaVersion := "${scalaVersion}"
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

    return fs.pathExists(path.join(dir, 'build.sbt'))
}

/**
 * Calls sbt ensimeConfig to generate .ensime
 */
function genDotEnsime(dir: string): PromiseLike<number> {
    const pid = spawn('sbt', ['ensimeConfig'], {cwd: dir})

    pid.stdin.end()

    pid.stdout.on('data', (chunk: Buffer | string) => {
        const chunkStr = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk.toString()
        log.debug('sbt ensimeConfig: ', chunkStr)
    })

    pid.stderr.on('data', (chunk: Buffer | string) => {
        const chunkStr = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk.toString()
        log.error('sbt ensimeConfig: ', chunkStr)
    })

    return new Promise((resolve, reject) => {
        pid.once('close', (exitCode: number) => {
            if (exitCode === 0) {
                resolve(exitCode)
            } else {
                reject(new Error(`sbt ensimeConfig fail with ${exitCode}`))
            }
        })
    })
}

async function startEnsime(dotEnsimePath: string, serverVersion: string = '2.0.0-M1'): Promise<ServerConnection> {
    const dotEnsime = await dotEnsimeUtils.parseDotEnsime(dotEnsimePath);
    log.debug('got a parsed .ensime')
    const assemblyJar = process.env.ENSIME_ASSEMBLY_JAR
    const serverStarter: ServerStarter = !assemblyJar
        ? (project: DotEnsime) => startServerFromDotEnsimeCP(project)
        : (project: DotEnsime) => startServerFromAssemblyJar(assemblyJar, project)

    return clientStarterFromServerStarter(serverStarter)(dotEnsime, serverVersion)
}

export async function expectEvents(api: Api, events: Event[]): Promise<Event[]>   {
    return new Promise<Event[]>((resolve, reject) => {
        let evIdx = 0
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

export function stripMargin(template: string[], ...expressions: string[]): string {
  const result = template.reduce((accumulator, part, i) => {
    return accumulator + expressions[i - 1] + part
  })

  return result.replace(/\r?(\n)\s*\|/g, '$1')
}
