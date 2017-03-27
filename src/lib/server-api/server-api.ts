import * as Promise from 'bluebird'
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
    const p = Promise.defer<string>()
    fs.outputFile(tempFilePath, bufferText, err => {
        if (err) {
            p.reject('error with file')
        } else {
            p.resolve(tempFilePath)
        }
    })
    return p.promise
}

export function apiOf(client: ServerConnection): Api {
    function getCompletions(filePath: string, bufferText: string, offset: number, noOfAutocompleteSuggestions: number) {
        return withTempFile(filePath, bufferText).then(tempFile => {
            const msg = {
                caseSens: false,
                fileInfo: {
                    contentsIn: tempFile,
                    file: filePath,
                },
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

    function typecheckBuffer(path: string, text: string) {
        return withTempFile(path, text).then(tempFilePath => {
            const msg = {
                fileInfo: {
                    contentsIn: tempFilePath,
                    file: path,
                },
                typehint: 'TypecheckFileReq',
            }
            return client.post(msg)
        })
    }

    function typecheckFile(path: string) {
        const msg = {
            fileInfo: {
                file: path,
            },
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

    function formatSourceFile(path, contents, callback) {
        return withTempFile(path, contents).then(tempFilePath => {
            const req = {
                file: {
                    contentsIn: tempFilePath,
                    file: path,
                },
                typehint: 'FormatOneSourceReq',
            }
            return client.post(req)
        })
    }

    function getImplicitInfo(path: string, startO: number, endO: number) {
        const msg = {
            file: path,
            range: {
                from: startO,
                to: endO,
            },
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

    return {
        getCompletions,
        getSymbolAtPoint,
        typecheckFile,
        typecheckBuffer,
        symbolByName,
        formatSourceFile,
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
    formatSourceFile: (path: any, contents: any, callback: any) => PromiseLike<Typehinted>
    getImplicitInfo: (path: string, startO: number, endO: number) => PromiseLike<Typehinted>
    getRefactoringPatch: (procId: number, refactoring: RefactoringDesc) => PromiseLike<Typehinted>
    typecheckAll(): void
    unloadAll(): void
    searchPublicSymbols(keywords: string[], maxSymbols: number): PromiseLike<Typehinted>
    getDocUriAtPoint(file: string, point: Point): PromiseLike<Typehinted>
    getImportSuggestions(file: string, characterIndex: number, symbol: string): PromiseLike<Typehinted>
}
