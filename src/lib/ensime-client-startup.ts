import {ChildProcess} from 'child_process'
import * as chokidar from 'chokidar'
import * as fs from 'fs'
import * as loglevel from 'loglevel'
import * as path from 'path'
import {ensureExistsDir} from './file-utils'
import {createConnection, ServerConnection} from './server-api/server-connection'
import {DotEnsime, ServerStarter} from './types'

const log = loglevel.getLogger('ensime.startup')

function removeTrailingNewline(str: string): string {
    return str.replace(/^\s+|\s+$/g, '')
}

function whenAdded(file: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        log.debug('starting watching for : ' + file)

        const watcher = chokidar.watch(file, {
            persistent: true,
        }).on('all', (event: any, path: any) => {
            log.debug('Seen: ', path)
            watcher.close()
            resolve()
        })

        log.debug('watching…')
    })
}

//  Start an ensime client given path to .ensime. If server already running, just use, else startup that too.
export default function(serverStarter: ServerStarter): (parsedDotEnsime: DotEnsime, serverVersion: string) => Promise<ServerConnection> {
    log.debug('creating client starter function from ServerStarter')
    return async (parsedDotEnsime: DotEnsime, serverVersion: string): Promise<ServerConnection> => {
        log.debug('trying to start client')

        await ensureExistsDir(parsedDotEnsime.cacheDir)

        const httpPortFilePath = parsedDotEnsime.cacheDir + path.sep + 'http'

        let serverProcessRef: Promise<ChildProcess | undefined> = Promise.resolve(undefined)

        if (!fs.existsSync(httpPortFilePath)) {
            log.debug('no server running, start that first…')
            serverProcessRef = Promise.all([
                whenAdded(httpPortFilePath),
                serverStarter(parsedDotEnsime)
            ]).then(([, serverProcess]) => serverProcess)
        } else {
            log.debug('port file already there, starting client')
        }

        const serverProcess = await serverProcessRef

        const httpPort = removeTrailingNewline(fs.readFileSync(httpPortFilePath).toString())
        const connection = await createConnection(httpPort, serverProcess)
        log.debug('got a connection')
        return connection
    }
}
