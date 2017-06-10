import loglevel = require('loglevel')
import * as WebSocket from 'ws'

export interface NetworkClient {
    destroy(): void
    send(msg: string): any
}

export class TcpClient implements NetworkClient {
    public destroy(): void {
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

        this.websocket.on('message', data => {
            log.debug(`incoming: ${data}`)
            onMsg(data.toString())
        })

        this.websocket.on('error', error => {
            log.error(error)
        })

        this.websocket.on('close', () => {
            log.debug('websocket closed from server')
        })

    }

    public destroy(): void {
        this.websocket.terminate()
    }

    public send(msg: string): any {
        this.websocket.send(msg)
    }

}
