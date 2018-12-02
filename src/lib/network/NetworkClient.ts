import loglevel = require('loglevel')
import * as WebSocket from 'ws'

export interface NetworkClient {
    destroy(): void
    send(msg: string): any
}

export class WebsocketClient implements NetworkClient {
    private static log = loglevel.getLogger('ensime-client');
    private websocket: WebSocket;

    constructor(ws: WebSocket, onNewMessage: (msg: string) => any) {
        this.websocket = ws;

        this.websocket.on('message', data => {
            WebsocketClient.log.debug(`incoming: ${data}`);
            onNewMessage(data.toString());
        })

        this.websocket.on('error', error => {
            WebsocketClient.log.error(error);
        })

        this.websocket.on('close', () => {
            WebsocketClient.log.debug('websocket closed from server');
        })
    }

    public static new(httpPort: string, onNewMessage: (msg: string) => any): Promise<WebsocketClient> {
        const uri = `ws://localhost:${httpPort}/websocket`;
        WebsocketClient.log.info(`Connecting to ${uri}`);
        const websocket = new WebSocket(uri, ['jerky']);

        return new Promise((resolve, reject) => {
            websocket.once('open', () => {
                WebsocketClient.log.info('Connected to Ensime server.');
                resolve(new WebsocketClient(websocket, onNewMessage));
            })

            websocket.once('error', (error: any) => {
                websocket.once('close', () => WebsocketClient.log.error('Unexpected close from Ensime server.'));
                reject(error);
            })
        })
    }

    public destroy(): void {
        this.websocket.terminate();
    }

    public send(msg: string): any {
        this.websocket.send(msg);
    }
}
