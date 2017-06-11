import loglevel = require('loglevel')
import * as WebSocket from 'ws'

export interface NetworkClient {
    destroy(): void
    send(msg: string): any
}

export class WebsocketClient implements NetworkClient {

    private static log = loglevel.getLogger('ensime-client')

    public static new(httpPort: string, onNewMessage: (msg: string) => any): Promise<WebsocketClient> {
        const websocket = new WebSocket(`ws://localhost:${httpPort}/websocket`, ['jerky'])

        return new Promise((resolve, reject) => {
            websocket.once('open', () => {
                WebsocketClient.log.info('Connected to Ensime server.')
                resolve(new WebsocketClient(websocket, onNewMessage))
            })

            websocket.once('error', error => reject(error))
        })
    }

    private websocket: WebSocket

    private constructor(ws: WebSocket, onNewMessage: (msg: string) => any) {
        this.websocket = ws

        this.websocket.on('message', data => {
            WebsocketClient.log.debug(`incoming: ${data}`)
            onNewMessage(data.toString())
        })

        this.websocket.on('error', error => {
            WebsocketClient.log.error(error)
        })

        this.websocket.on('close', () => {
            WebsocketClient.log.debug('websocket closed from server')
        })
    }

    public destroy(): void {
        this.websocket.terminate()
    }

    public send(msg: string): any {
        this.websocket.send(msg)
    }
}
