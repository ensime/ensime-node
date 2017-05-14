import {ChildProcess} from 'child_process'
import {ensureExists} from './file-utils'
import {createConnection, ServerConnection} from './server-api/server-connection'
import fs = require('fs')
import path = require('path')
import loglevel = require('loglevel')
import chokidar = require('chokidar')
import * as Promise from 'bluebird'
import {DotEnsime, ServerStarter} from './types'

const log = loglevel.getLogger('ensime.startup')

const removeTrailingNewline = (str: string) => str.replace(/^\s+|\s+$/g, '')

const whenAdded = (file: string) =>
    new Promise((resolve, reject) => {
        log.debug('starting watching for : ' + file)

        const watcher = chokidar.watch(file, {
            persistent: true,
        }).on('all', (event, path) => {
            log.debug('Seen: ', path)
            watcher.close()
            resolve()
        })

        log.debug('watching…')
    })

//  Start an ensime client given path to .ensime. If server already running, just use, else startup that too.
export default function(serverStarter: ServerStarter) {
    log.debug('creating client starter function from ServerStarter')
    return (parsedDotEnsime: DotEnsime, serverVersion: string, generalHandler: (msg: string) => any): PromiseLike<ServerConnection> => {

        log.debug('trying to start client')

        return ensureExists(parsedDotEnsime.cacheDir).then(() => {
            const httpPortFilePath = parsedDotEnsime.cacheDir + path.sep + 'http'

            let serverProcessRef: PromiseLike<ChildProcess> = Promise.resolve(undefined)

            if (!fs.existsSync(httpPortFilePath)) {
                log.debug('no server running, start that first…')
                serverProcessRef = Promise.all([
                    whenAdded(httpPortFilePath),
                    serverStarter(parsedDotEnsime)
                ]).then(([, serverProcess]) => serverProcess)
            } else {
                log.debug('port file already there, starting client')
            }

            return serverProcessRef.then(serverProcess => {
                const httpPort = removeTrailingNewline(fs.readFileSync(httpPortFilePath).toString())
                const connectionPromise = createConnection(httpPort, generalHandler, serverProcess)
                return connectionPromise.then(connection => {
                    log.debug('got a connection')
                    return connection
                })
            })
        })
    }
}
