import * as Promise from 'bluebird'
import {ChildProcess} from 'child_process'
import {EventEmitter} from 'events'
import * as loglevel from 'loglevel'
import {WebsocketClient} from '../network/NetworkClient'
import {Event, Typehinted} from '../server-api/server-protocol'

const log = loglevel.getLogger('ensime.client')

export type CallId = number
export type CallbackMap = Map<CallId, Promise.Resolver<any>>
export type EventHandler = (ev: Event) => void

/**
 * A running and connected ensime client
 *
 * low-level api
 */
export class ServerConnection {
    public readonly httpPort: string
    private netClient: WebsocketClient
    private serverProcess?: ChildProcess
    private callbackMap: CallbackMap
    private serverEvents: EventEmitter
    private ensimeMessageCounter = 1

    constructor(httpPort: string, netClient: WebsocketClient, callbackMap: CallbackMap, serverEvents: EventEmitter, serverProcess?: ChildProcess) {
        this.httpPort = httpPort
        this.netClient = netClient
        this.callbackMap = callbackMap
        this.serverEvents = serverEvents
        this.serverProcess = serverProcess
    }

    public onEvents(listener: EventHandler, once: boolean = false) {
        if (!once) {
            this.serverEvents.on('events', listener)
        } else {
            this.serverEvents.once('events', listener)
        }
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

    public destroy(): PromiseLike<number> {
        this.netClient.destroy()
        if (this.serverProcess) {
            return this.killServer()
        }
        return Promise.resolve(0)
    }

    private killServer(): PromiseLike<number> {
        const p = Promise.defer<number>()
        this.serverProcess.on('close', code => {
            p.resolve(code)
        })
        this.serverProcess.kill()
        return p.promise
    }
}

export function createConnection(httpPort: string, serverProcess?: ChildProcess): PromiseLike<ServerConnection> {
    const deferredConnection = Promise.defer<ServerConnection>()

    const callbackMap: CallbackMap = new Map()
    const serverEvents: EventEmitter = new EventEmitter()

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
            serverEvents.emit('events', json.payload)
        }
    }

    function onConnect() {
        log.debug('creating client api')
        deferredConnection.resolve(new ServerConnection(httpPort, netClient, callbackMap, serverEvents, serverProcess))
    }

    const netClient = new WebsocketClient(httpPort, onConnect, handleIncoming)

    return deferredConnection.promise
}
