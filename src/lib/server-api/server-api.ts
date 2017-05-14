import * as Promise from 'bluebird'
import {OffsetRange, SourceFileInfo} from './server-commons'
import {ServerConnection} from './server-connection'
import {CompletionsResponse, Point, RefactoringDesc, SymbolInfo, Typehinted} from './server-protocol'
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

export function apiOf(client: ServerConnection): Api {

    function getCompletions(filePath: string, bufferText: string, offset: number, noOfAutocompleteSuggestions: number) {
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
            return client.post(msg)
        })
    }

    function getSymbolAtPoint(path: string, offset): PromiseLike<Typehinted> {
        return new Promise<Typehinted>((resolve, reject) => {
            const req = {
                file: path,
                point: offset,
                typehint: 'SymbolAtPointReq',
            }
            client.post(req).then(msg => {
                if (msg.typehint === 'SymbolInfo') {
                    resolve(msg)
                } else {
                    reject('no symbol response')
                }
            })
        })
    }

    function typecheckBuffer(filePath: string, text: string) {
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
    }

    function typecheckFile(filePath: string) {
        const fileInfo: SourceFileInfo = {
            file: filePath,
        }
        const msg = {
            fileInfo,
            typehint: 'TypecheckFileReq',
        }
        return client.post(msg)
    }

    function symbolByName(qualifiedName) {
        const msg = {
            typeFullName: qualifiedName,
            typehint: 'SymbolByNameReq',
        }
        return client.post(msg)
    }

    function getImplicitInfo(path: string, startO: number, endO: number) {
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
    }

    function typecheckAll() {
        return client.post({ typehint: 'TypecheckAllReq' })
    }

    function unloadAll() {
        return client.post({ typehint: 'UnloadAllReq' })
    }

    function getRefactoringPatch(procId: number, refactoring: RefactoringDesc) {
        const req = {
            interactive: false,
            procId,
            params: refactoring,
            typehint: 'RefactorReq',
        }
        return client.post(req)
    }

    function searchPublicSymbols(keywords: string[], maxSymbols: number) {
        return client.post({
            keywords,
            maxResults: maxSymbols,
            typehint: 'PublicSymbolSearchReq',
        })
    }

    function getDocUriAtPoint(file: string, point: Point) {
        return client.post({
            file,
            point,
            typehint: 'DocUriAtPointReq',
        })
    }

    function getImportSuggestions(file: string, characterIndex: number, symbol: string) {
        return client.post({
            file,
            maxResults: 10,
            names: [symbol],
            point: characterIndex,
            typehint: 'ImportSuggestionsReq',
        })
    }

    function getTypeByName(name: string) {
        const req = {
            name,
            typehint: 'TypeByNameReq',
        }
        return client.post(req)
    }

    function getTypeByNameAtPoint(name: string, file: string, startO: number, endO: number) {
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
        return client.post(req)
    }

    function getTypeAtPoint(file: string, startO: number, endO: number) {
        const range: OffsetRange = {
            from: startO,
            to: endO,
        }
        const req = {
            file,
            range,
            typehint: 'TypeAtPointReq',
        }
        return client.post(req)
    }

    return {
        getCompletions,
        getSymbolAtPoint,
        typecheckFile,
        typecheckBuffer,
        symbolByName,
        getImplicitInfo,
        typecheckAll,
        unloadAll,
        getRefactoringPatch,
        searchPublicSymbols,
        getDocUriAtPoint,
        getImportSuggestions,
    }
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
}
