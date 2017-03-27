import * as _ from 'lodash'
import 'path'
import {apiOf, Api} from '../server-api/server-api'
import {ServerConnection} from '../server-api/server-connection'
import {DotEnsime} from '../types'

export interface EnsimeInstance<UI> {
    api: Api
    dotEnsime: DotEnsime
    httpPort: string
    rootDir: string
    /** Client specific ui to use for ui switching and stuff */
    ui: UI
    destroy(): any
    isSourceOf(path: string): boolean
}

export function makeInstanceOf<T extends { destroy(): void }>(dotEnsime: DotEnsime, connection: ServerConnection, ui: T): EnsimeInstance<T> {
    function destroy() {
        connection.destroy()
        if (ui) {
            ui.destroy()
        }
    }

    const isSourceOf = (path: string) => _.some(dotEnsime.sourceRoots, sourceRoot => _.startsWith(path, sourceRoot))

    return {
        api: apiOf(connection),
        httpPort: connection.httpPort,
        rootDir: dotEnsime.rootDir,
        destroy,
        isSourceOf,
        dotEnsime,
        ui,
    }
}
