import {ChildProcess} from 'child_process'
import {EventEmitter} from 'events'
import * as loglevel from 'loglevel'
import {WebsocketClient} from '../network/NetworkClient'
import {Event, Typehinted} from '../server-api/server-protocol'

const log = loglevel.getLogger('ensime.client')

export type CallId = number
export type EventHandler = (ev: Event) => void
export type Cancellable = () => void

export type CallbackMap<T=any> = Map<CallId, Deferred<T>>

export interface Deferred<T> {
    promise: Promise<T>;
    resolve: (obj: T) => void;
    reject: (err: any) => void;
}

/**
 * A running and connected ensime client
 *
 * low-level api
 */
export class ServerConnection {
    public readonly httpPort: string
    private client: WebsocketClient
    private serverProcess?: ChildProcess
    private callbackMap: CallbackMap
    private serverEvents: EventEmitter
    private ensimeMessageCounter = 1

    constructor(httpPort: string, client: WebsocketClient, callbackMap: CallbackMap, serverEvents: EventEmitter, serverProcess?: ChildProcess) {
        this.httpPort = httpPort
        this.client = client
        this.callbackMap = callbackMap
        this.serverEvents = serverEvents
        this.serverProcess = serverProcess
    }

    /**
     * Register a listener to handle any asyncronic messages
     * @param  {EventHandler} listener
     * @param  {boolean} once if it's true, the listener is only going to be executed once
     * @return {Cancellable} returns a function to remove the listener, when it is executed
     */
    public onEvents(listener: EventHandler, once: boolean = false): Cancellable {
        if (!once) {
            this.serverEvents.on('events', listener)
        } else {
            this.serverEvents.once('events', listener)
        }
        return () => this.serverEvents.removeListener('events', listener)
    }

    /**
     * Post a msg object
     */
    public async post<T extends Typehinted>(msg: any): Promise<T> {
        let dResolve: any;
        let dReject: any;
        const p = new Promise<any>((resolve, reject) => {
            dResolve = resolve;
            dReject = reject;
        })

        const d: Deferred<T> = {
            promise: p,
            resolve: dResolve,
            reject: dReject
        }

        const wireMsg = `{"req": ${JSON.stringify(msg)}, "callId": ${this.ensimeMessageCounter}}`
        this.callbackMap.set(this.ensimeMessageCounter++, d)
        log.debug('outgoing: ' + wireMsg)
        this.client.send(wireMsg)
        return d.promise;
    }

    public async destroy(): Promise<number> {
        this.client.destroy();
        return this.killServer();
    }

    private async killServer(): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            if (this.serverProcess) {
                let isClosed = false;
                this.serverProcess.once("close", code => {
                    if (!isClosed) {
                        return resolve(code);
                    }
                });
                this.serverProcess.once("error", err => {
                    isClosed = true;
                    reject(err);
                });
                this.serverProcess.kill();
            } else {
                return resolve(0);
            }
        });
    }
}

export async function createConnection(httpPort: string, serverProcess?: ChildProcess): Promise<ServerConnection> {
    const callbackMap: CallbackMap = new Map();
    const serverEvents: EventEmitter = new EventEmitter();

    serverEvents.setMaxListeners(50);

    function handleIncoming(msg: any): void {
        const json = JSON.parse(msg)
        log.debug('incoming: ', json)
        const callId = json.callId
        // If RpcResponse - lookup in map, otherwise use some general function for handling general msgs

        if (callId) {
            try {
                const deferredObj = callbackMap.get(callId)!
                log.debug('resolving promise: ' + deferredObj.promise)
                deferredObj.resolve(json.payload)
            } catch (error) {
                log.trace(`error in callback: ${error}`)
            } finally {
                callbackMap.delete(callId)
            }
        } else {
            serverEvents.emit('events', json.payload)
        }
    }

    return WebsocketClient.new(httpPort, handleIncoming).then(ws => new ServerConnection(httpPort, ws, callbackMap, serverEvents, serverProcess))
}
