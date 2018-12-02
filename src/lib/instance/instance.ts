import * as _ from 'lodash'
import * as path from 'path'
import {parseDotEnsime} from '../dotensime-utils'
import {writeFile} from '../file-utils'
import {apiOf, Api} from '../server-api/server-api'
import {ServerConnection} from '../server-api/server-connection'
import {DotEnsime} from '../types'

export interface UI {
    destroy(): void
}

export class EnsimeInstance<T extends UI> {
    public readonly connection: ServerConnection
    public readonly dotEnsime: DotEnsime
    public readonly api: Api
    public readonly httpPort: string
    public readonly rootDir: string
    /** Client specific ui to use for ui switching and stuff */
    public readonly ui?: T

    constructor(dotEnsime: DotEnsime, connection: ServerConnection, ui?: T) {
        this.dotEnsime = dotEnsime
        this.connection = connection
        this.api = apiOf(connection)
        this.rootDir = dotEnsime.rootDir
        this.httpPort = connection.httpPort
        this.ui = ui
    }

    public async addFiles(files: { [path: string]: string}): Promise<void> {
        await Promise.all(Object.keys(files).map(fileRelativePath => writeFile(this.pathOf(fileRelativePath), files[fileRelativePath])))
    }

    public pathOf(relativePath: string): string {
        return path.join(this.rootDir, relativePath)
    }

    public async destroy(): Promise<void> {
        await this.connection.destroy()
        if (this.ui) {
            this.ui.destroy()
        }
    }

    public isSourceOf(path: string): boolean {
        return _.some(this.dotEnsime.sourceRoots, sourceRoot => _.startsWith(path, sourceRoot))
    }
}

export async function makeInstanceFromPath<T extends UI>(path: string, connection: ServerConnection, ui?: T): Promise<EnsimeInstance<T>> {
    const dotEnsimeFile = await parseDotEnsime(path)
    return makeInstanceFromRef(dotEnsimeFile, connection, ui)
}

export function makeInstanceFromRef<T extends UI>(dotEnsime: DotEnsime, connection: ServerConnection, ui?: T): EnsimeInstance<T> {
    return new EnsimeInstance<T>(dotEnsime, connection, ui)
}
