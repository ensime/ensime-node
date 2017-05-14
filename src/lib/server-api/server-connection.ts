import * as Promise from 'bluebird'
import {ChildProcess} from 'child_process'
import * as loglevel from 'loglevel'
import {WebsocketClient} from '../network/NetworkClient'
import {Typehinted} from '../server-api/server-protocol'

const log = loglevel.getLogger('ensime.client')

export type CallId = number
export type CallbackMap = Map<CallId, Promise.Resolver<any>>

/**
 * A running and connected ensime client
 *
 * low-level api
 */
export class ServerConnection {
    public readonly httpPort: string
    private netClient: WebsocketClient
    private serverPid?: ChildProcess
    private callbackMap: CallbackMap
    private ensimeMessageCounter = 1

    constructor(httpPort: string, netClient: WebsocketClient, callbackMap: CallbackMap, serverPid?: ChildProcess) {
        this.httpPort = httpPort
        this.netClient = netClient
        this.callbackMap = callbackMap
        this.serverPid = serverPid
    }

    /**
     * Post a msg object
     */
    public post<T extends Typehinted>(msg: any): PromiseLike<T> {
        const p = Promise.defer<T>()
        const wireMsg = `{"req": ${JSON.stringify(msg)}, "callId": ${this.ensimeMessageCounter}}`
        this.callbackMap.set(this.ensimeMessageCounter++, p)
        log.debug('outgoing: ' + wireMsg)
        this.netClient.send(wireMsg)
        return p.promise
    }

    public destroy() {
        this.netClient.destroy()
        if (this.serverPid) {
            this.serverPid.kill()
        }
    }
}

export function createConnection(httpPort: string, generalMsgHandler, serverPid?: ChildProcess): PromiseLike<ServerConnection> {
    const deferredConnection = Promise.defer<ServerConnection>()

    const callbackMap: CallbackMap = new Map()

    function handleIncoming(msg) {
        const json = JSON.parse(msg)
        log.debug('incoming: ', json)
        const callId = json.callId
        // If RpcResponse - lookup in map, otherwise use some general function for handling general msgs

        if (callId) {
            try {
                const p = callbackMap.get(callId)
                log.debug('resolving promise: ' + p)
                p.resolve(json.payload)
            } catch (error) {
                log.trace(`error in callback: ${error}`)
            } finally {
                callbackMap.delete(callId)
            }
        } else {
            return generalMsgHandler(json.payload)
        }
    }

    function onConnect() {
        log.debug('creating client api')
        deferredConnection.resolve(new ServerConnection(httpPort, netClient, callbackMap, serverPid))
    }

    const netClient = new WebsocketClient(httpPort, onConnect, handleIncoming)

    return deferredConnection.promise
}
