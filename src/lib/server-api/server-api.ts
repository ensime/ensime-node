import * as Promise from 'bluebird'
import {OffsetRange, SourceFileInfo} from './server-commons'
import {ServerConnection} from './server-connection'
import {
    BreakpointList,
    CompletionsResponse,
    DebugVmStatus,
    False,
    Point,
    RefactoringDesc,
    SymbolInfo,
    True,
    Typehinted,
    TypeInfo,
    Void
} from './server-protocol'
import fs = require('fs-extra')
import * as path from 'path'
import * as temp from 'temp'

temp.track()
const tempDir = temp.mkdirSync('ensime-temp-files')
const getTempDir = () => tempDir

const getTempPath = file => {
    if (process.platform === 'win32') {
        return path.join(getTempDir(), file.replace(':', ''))
    }
    return path.join(getTempDir(), file)
}

const withTempFile = (filePath: string, bufferText: string): PromiseLike<string> => {
    const tempFilePath = getTempPath(filePath)
    return new Promise<string>((resolve, reject) => {
        fs.outputFile(tempFilePath, bufferText, err => {
            if (err) {
                reject('error with file')
            } else {
                resolve(tempFilePath)
            }
        })
    })
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
        getCompletions(filePath: string, bufferText: string, offset: number, noOfAutocompleteSuggestions: number): PromiseLike<CompletionsResponse> {
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

        getSymbolAtPoint(path: string, offset): PromiseLike<SymbolInfo> {
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

        typecheckBuffer(filePath: string, text: string) {
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

        typecheckFile(filePath: string) {
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

        getImplicitInfo(path: string, startO: number, endO: number) {
            const range: OffsetRange = {
                from: startO,
                to: endO,
            }
            const msg = {
                file: path,
                range,
                typehint: 'ImplicitInfoReq',
            }
            return client.post(msg)
        },

        typecheckAll() {
            return client.post({ typehint: 'TypecheckAllReq' })
        },

        unloadAll() {
            return client.post({ typehint: 'UnloadAllReq' })
        },

        getRefactoringPatch(procId: number, refactoring: RefactoringDesc) {
            const req = {
                interactive: false,
                procId,
                params: refactoring,
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

        getImportSuggestions(file: string, characterIndex: number, symbol: string) {
            return client.post({
                file,
                maxResults: 10,
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
    getCompletions: (filePath: string, bufferText: any, offset: any, noOfAutocompleteSuggestions: any) => PromiseLike<CompletionsResponse>
    getSymbolAtPoint: (path: string, offset: any) => PromiseLike<SymbolInfo>
    typecheckFile: (path: string) => PromiseLike<Typehinted>
    typecheckBuffer: (path: string, text: string) => void
    symbolByName: (qualifiedName: any) => PromiseLike<Typehinted>
    getImplicitInfo: (path: string, startO: number, endO: number) => PromiseLike<Typehinted>
    getRefactoringPatch: (procId: number, refactoring: RefactoringDesc) => PromiseLike<Typehinted>
    typecheckAll(): void
    unloadAll(): void
    searchPublicSymbols(keywords: string[], maxSymbols: number): PromiseLike<Typehinted>
    getDocUriAtPoint(file: string, point: Point): PromiseLike<Typehinted>
    getImportSuggestions(file: string, characterIndex: number, symbol: string): PromiseLike<Typehinted>
    getTypeByName(name: string): PromiseLike<TypeInfo>
    getTypeByNameAtPoint(name: string, file: string, startO: number, endO: number): PromiseLike<TypeInfo>
    getTypeAtPoint(file: string, startO: number, endO: number): PromiseLike<TypeInfo>
    removeFile(file: string): PromiseLike<Void>
    debugger(): DebuggerApi
}
