import fs = require('fs-extra')
import * as path from 'path'
import * as temp from 'temp'
import {OffsetRange, SourceFileInfo} from './server-commons'
import {Cancellable, EventHandler, ServerConnection} from './server-connection'
import {
    BreakpointList,
    CompletionsResponse,
    ConnectionInfo,
    DebugVmStatus,
    False,
    ImplicitInfos,
    ImportSuggestions,
    Point,
    RefactorDesc,
    RefactorDiffEffect,
    RefactorFailure,
    SymbolInfo,
    True,
    Typehinted,
    TypeInfo,
    Void
} from './server-protocol'

temp.track()
const tempDir = temp.mkdirSync('ensime-temp-files')

function getTempDir(): string {
    return tempDir
}

function getTempPath(filePath: string): string {
    return process.platform === 'win32' ? path.join(getTempDir(), filePath.replace(':', '')) : path.join(getTempDir(), filePath)
}

async function withTempFile(filePath: string, bufferText: string): Promise<string> {
    const tempFilePath = getTempPath(filePath)
    await fs.outputFile(tempFilePath, bufferText)
    return tempFilePath
}

function debuggerApiOf(client: ServerConnection): DebuggerApi {
    return {
        start(): PromiseLike<True | False> {
            const req = { typehint: 'DebugRunReq' }
            return client.post<True | False>(req)
        },

        stop(): PromiseLike<True | False> {
            const req = { typehint: 'DebugStopReq' }
            return client.post<True | False>(req)
        },

        attach(hostname: string, port: string): PromiseLike<DebugVmStatus> {
            const req = {
                hostname,
                port,
                typehint: 'DebugAttachReq'
            }
            return client.post<DebugVmStatus>(req)
        },

        isActive(): PromiseLike<True | False> {
            const req = { typehint: 'DebugActiveVmReq' }
            return client.post<True | False>(req)
        },

        setBreakpoint(file: string, line: number): PromiseLike<Void> {
            const req = {
                file,
                line,
                typehint: 'DebugSetBreakReq'
            }
            return client.post<Void>(req)
        },

        clearBreakpoint(file: string, line: number): PromiseLike<Void> {
            const req = {
                file,
                line,
                typehint: 'DebugClearBreakReq'
            }
            return client.post<Void>(req)
        },

        clearAllBreakpoints(): PromiseLike<Void> {
            const req = { typehint: 'DebugClearAllBreaksReq' }
            return client.post<Void>(req)
        },

        listBreakpoints(): PromiseLike<BreakpointList> {
            const req = { typehint: 'DebugListBreakpointsReq' }
            return client.post<BreakpointList>(req)
        },
    }
}

export function apiOf(client: ServerConnection): Api {
    return {
        onEvents(listener: EventHandler, once?: boolean): Cancellable {
            return client.onEvents(listener, once)
        },

        getConnectionInfo(): PromiseLike<ConnectionInfo> {
            return client.post<ConnectionInfo>({ typehint: 'ConnectionInfoReq' })
        },

        getCompletions(filePath: string, bufferText: string, offset: number, noOfAutocompleteSuggestions: number = 10): PromiseLike<CompletionsResponse> {
            return withTempFile(filePath, bufferText).then(tempFilePath => {
                const fileInfo: SourceFileInfo = {
                    contentsIn: tempFilePath,
                    file: filePath,
                }
                const msg = {
                    caseSens: false,
                    fileInfo,
                    maxResults: noOfAutocompleteSuggestions,
                    point: offset,
                    reload: true,
                    typehint: 'CompletionsReq',
                }
                return client.post<CompletionsResponse>(msg)
            })
        },

        async getSymbolAtPoint(path: string, offset: number): Promise<SymbolInfo> {
            const req = {
                file: path,
                point: offset,
                typehint: 'SymbolAtPointReq',
            }
            return client.post<SymbolInfo>(req).then(msg => {
                if (msg.typehint === 'SymbolInfo') {
                    return msg
                }
                return Promise.reject<SymbolInfo>('no symbol response')
            })
        },

        typecheckBuffer(filePath: string, text: string): PromiseLike<Void> {
            return withTempFile(filePath, text).then(tempFilePath => {
                const fileInfo: SourceFileInfo = {
                    contentsIn: tempFilePath,
                    file: filePath,
                }
                const msg = {
                    fileInfo,
                    typehint: 'TypecheckFileReq',
                }
                return client.post(msg)
            })
        },

        typecheckFile(filePath: string): PromiseLike<Void> {
            const fileInfo: SourceFileInfo = {
                file: filePath,
            }
            const msg = {
                fileInfo,
                typehint: 'TypecheckFileReq',
            }
            return client.post(msg)
        },

        symbolByName(qualifiedName) {
            const msg = {
                typeFullName: qualifiedName,
                typehint: 'SymbolByNameReq',
            }
            return client.post(msg)
        },

        getImplicitInfo(path: string, from: number, to: number): PromiseLike<ImplicitInfos> {
            const range: OffsetRange = { from, to }
            const msg = {
                file: path,
                range,
                typehint: 'ImplicitInfoReq',
            }
            return client.post(msg)
        },

        typecheckAll(): PromiseLike<Void> {
            return client.post({ typehint: 'TypecheckAllReq' })
        },

        unloadAll(): PromiseLike<Void> {
            return client.post({ typehint: 'UnloadAllReq' })
        },

        getRefactoringPatch<R extends RefactorDesc>(procId: number, params: R): PromiseLike<RefactorDiffEffect | RefactorFailure> {
            const req = {
                interactive: false,
                procId,
                params,
                typehint: 'RefactorReq',
            }
            return client.post(req)
        },

        searchPublicSymbols(keywords: string[], maxSymbols: number) {
            return client.post({
                keywords,
                maxResults: maxSymbols,
                typehint: 'PublicSymbolSearchReq',
            })
        },

        getDocUriAtPoint(file: string, point: Point) {
            return client.post({
                file,
                point,
                typehint: 'DocUriAtPointReq',
            })
        },

        getImportSuggestions(file: string, characterIndex: number, symbol: string, maxResults: number = 10): PromiseLike<ImportSuggestions> {
            return client.post<ImportSuggestions>({
                file,
                maxResults,
                names: [symbol],
                point: characterIndex,
                typehint: 'ImportSuggestionsReq',
            })
        },

        getTypeByName(name: string): PromiseLike<TypeInfo> {
            const req = {
                name,
                typehint: 'TypeByNameReq',
            }
            return client.post<TypeInfo>(req)
        },

        getTypeByNameAtPoint(name: string, file: string, startO: number, endO: number): PromiseLike<TypeInfo> {
            const range: OffsetRange = {
                from: startO,
                to: endO,
            }
            const req = {
                name,
                file,
                range,
                typehint: 'TypeByNameAtPointReq',
            }
            return client.post<TypeInfo>(req)
        },

        getTypeAtPoint(file: string, startO: number, endO: number): PromiseLike<TypeInfo> {
            const range: OffsetRange = {
                from: startO,
                to: endO,
            }
            const req = {
                file,
                range,
                typehint: 'TypeAtPointReq',
            }
            return client.post<TypeInfo>(req)
        },

        removeFile(file: string): PromiseLike<Void> {
            const req = {
                file,
                typehint: 'RemoveFileReq',
            }
            return client.post<Void>(req)
        },

        debugger(): DebuggerApi {
            return debuggerApiOf(client)
        },
    }
}

export interface DebuggerApi {
    start(): PromiseLike<True | False>
    stop(): PromiseLike<True | False>
    attach(hostname: string, port: string): PromiseLike<DebugVmStatus>
    isActive(): PromiseLike<True | False>
    setBreakpoint(file: string, line: number): PromiseLike<Void>
    clearBreakpoint(file: string, line: number): PromiseLike<Void>
    clearAllBreakpoints(): PromiseLike<Void>
    listBreakpoints(): PromiseLike<BreakpointList>
}

export interface Api {
    onEvents: (listener: EventHandler, once?: boolean) => Cancellable
    getConnectionInfo: () => PromiseLike<ConnectionInfo>
    getCompletions: (filePath: string, bufferText: string, offset: number, noOfAutocompleteSuggestions?: number) => PromiseLike<CompletionsResponse>
    getSymbolAtPoint: (path: string, offset: number) => PromiseLike<SymbolInfo>
    typecheckFile: (path: string) => PromiseLike<Void>
    typecheckBuffer: (path: string, text: string) => PromiseLike<Void>
    symbolByName: (qualifiedName: any) => PromiseLike<Typehinted>
    getImplicitInfo: (path: string, from: number, to: number) => PromiseLike<ImplicitInfos>
    getRefactoringPatch<R extends RefactorDesc>(procId: number, params: R): PromiseLike<RefactorDiffEffect | RefactorFailure>
    typecheckAll(): PromiseLike<Void>
    unloadAll(): PromiseLike<Void>
    searchPublicSymbols(keywords: string[], maxSymbols: number): PromiseLike<Typehinted>
    getDocUriAtPoint(file: string, point: Point): PromiseLike<Typehinted>
    getImportSuggestions(file: string, characterIndex: number, symbol: string, maxResults?: number): PromiseLike<ImportSuggestions>
    getTypeByName(name: string): PromiseLike<TypeInfo>
    getTypeByNameAtPoint(name: string, file: string, startO: number, endO: number): PromiseLike<TypeInfo>
    getTypeAtPoint(file: string, startO: number, endO: number): PromiseLike<TypeInfo>
    removeFile(file: string): PromiseLike<Void>
    debugger(): DebuggerApi
}
