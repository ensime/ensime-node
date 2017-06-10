import loglevel = require('loglevel')
import * as WebSocket from 'ws'

export interface NetworkClient {
    destroy(): any
    send(msg: string): any
}

export class TcpClient implements NetworkClient {
    public destroy() {
        // empty
    }

    public send(msg: string): any {
         // empty
    }
}

export class WebsocketClient implements NetworkClient {
    private websocket: WebSocket

    constructor(httpPort: string, onConnected: () => any, onMsg: (msg: string) => any) {
        const log = loglevel.getLogger('ensime-client')

        this.websocket = new WebSocket(`ws://localhost:${httpPort}/websocket`, ['jerky'])

        this.websocket.on('open', () => {
            log.debug('connecting websocket…')
            onConnected()
        })

        this.websocket.on('message', msg => {
            log.debug(`incoming: ${msg}`)
            onMsg(msg)
        })

        this.websocket.on('error', error => {
            log.error(error)
        })

        this.websocket.on('close', () => {
            log.debug('websocket closed from server')
        })

    }

    public destroy() {
        this.websocket.terminate()
    }

    public send(msg: string) {
        this.websocket.send(msg)
    }
}
