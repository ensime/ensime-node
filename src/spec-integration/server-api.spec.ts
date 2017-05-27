import * as path from 'path'
import * as temp from 'temp'

import loglevel = require('loglevel')
import {EnsimeInstance} from '../lib/instance'
import {Api} from '../lib/server-api/server-api'
import {ServerConnection} from '../lib/server-api/server-connection'
import {
    AnalyzerReady,
    ClearAllScalaNotes,
    Event,
    FullTypeCheckComplete,
    ImplicitInfo,
    ImplicitInfos,
    ImportSuggestions,
    IndexerReady,
    NewScalaNotes,
    Note,
    SendBackgroundMessage,
    TypeInfo,
    Void
} from '../lib/server-api/server-protocol'
import {expectEvents, setupProject} from './utils'

const log = loglevel.getLogger('server-api')

const voidResponse: Void = { typehint: 'VoidResponse' }

describe('Server API', () => {
    let instance: EnsimeInstance<any>
    let api: Api
    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200000

    beforeAll(done => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 2000000
        originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL
        setupProject().then(_instance => {
            instance = _instance
            api = _instance.api

            return _instance.addFiles({
             [path.join('src', 'main', 'scala', 'Test_Types.scala')]: 'case class User(name: String, age: Int)',
             [path.join('src', 'main', 'scala', 'Test_Import_Suggestions.scala')]: 'Success("Test")',
             [path.join('src', 'main', 'scala', 'Test_Typecheck_File.scala')]: `
                 import scala.utilss._

                 object Main {
                   def main(args: Array[String]) {
                     val userName: String = 2
                     Success(userName)
                   }
                 }
             `
         }).then(() =>  done())
        })
    })

    afterAll(done => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout
        instance.destroy().then(() => done())
    })

    it('should get connection info', async done => {
        const sendBackgroundMessage: SendBackgroundMessage = {
            typehint: 'SendBackgroundMessageEvent',
            code: 105,
            detail: 'Initializing Analyzer. Please wait...'
        }
        const analyzerReadyEvent: AnalyzerReady = { typehint: 'AnalyzerReadyEvent' }
        const fullTypeCheckComplete: FullTypeCheckComplete = { typehint: 'FullTypeCheckCompleteEvent' }
        const indexerReadyEvent: IndexerReady = { typehint: 'IndexerReadyEvent' }

        const events = expectEvents(api, [sendBackgroundMessage, analyzerReadyEvent, fullTypeCheckComplete, indexerReadyEvent])
        const connectionInfoRes = await api.getConnectionInfo()
        expect(connectionInfoRes).toEqual({ typehint: 'ConnectionInfo', implementation: {name: 'ENSIME' }, version: '1.9.1' })
        events.then(() => done())
    })

    it('should get type at point', async done => {
        const targetFile = instance.pathOf(path.join('src', 'main', 'scala', 'Test_Types.scala'))
        const expectedTypeAtPointRes = {
            name: 'User',
            fullName: 'User',
            pos: {
              typehint: 'OffsetSourcePosition',
              file: targetFile,
              offset: 11
            },
            typehint: 'BasicTypeInfo',
            typeParams: [],
            typeArgs: [],
            members: [],
            declAs: {
              typehint: 'Class'
            }
        }
        const typeAtPointRes = await api.getTypeAtPoint(targetFile, 11, 15)
        expect(typeAtPointRes).toEqual(expectedTypeAtPointRes)
        done()
    })

    it('should get import suggestions', async done => {
        const targetFile = instance.pathOf(path.join('src', 'main', 'scala', 'Test_Import_Suggestions.scala'))
        const expectedimportSuggestionsRes = {
            typehint: 'ImportSuggestions',
            symLists: [[{
                name: 'scala.util.Success',
                localName: 'Success',
                pos: {
                    typehint: 'LineSourcePosition',
                    file: instance.pathOf(path.join('.ensime_cache', 'dep-src', 'source-jars', 'scala', 'util', 'Try.scala')),
                    line: 225
                },
                typehint: 'TypeSearchResult',
                declAs: {
                    typehint: 'Class'
                }
            }]]
        }
        const importSuggestionsRes = await api.getImportSuggestions(targetFile, 0, 'Success')
        expect(importSuggestionsRes).toEqual(expectedimportSuggestionsRes)
        done()
    })

    it('should typecheck file', async done => {
        const targetFile = instance.pathOf(path.join('src', 'main', 'scala', 'Test_Typecheck_File.scala'))

        const clearAllScalaNotesEvent: ClearAllScalaNotes = {
            typehint: 'ClearAllScalaNotesEvent'
        }
        const newScalaNotesEvent1: NewScalaNotes = {
            typehint: 'NewScalaNotesEvent',
            isFull: false,
            notes: [{
              beg: 121,
              line: 5,
              col: 50,
              end: 121,
              file: targetFile,
              msg: 'Procedure syntax is deprecated. Convert procedure `main` to method by adding `: Unit =`.',
              severity: {
                typehint: 'NoteWarn'
              }
          }]
        }
        const newScalaNotesEvent2: NewScalaNotes = {
            typehint: 'NewScalaNotesEvent',
            isFull: false,
            notes: [{
              beg: 25,
              line: 2,
              col: 31,
              end: 37,
              file: targetFile,
              msg: 'object utilss is not a member of package scala',
              severity: {
                typehint: 'NoteError'
              }
          }]
        }
        const newScalaNotesEvent3: NewScalaNotes = {
            typehint: 'NewScalaNotesEvent',
            isFull: false,
            notes: [{
              beg: 167,
              line: 6,
              col: 45,
              end: 168,
              file: targetFile,
              msg: 'type mismatch;\n found   : Int(2)\n required: String',
              severity: {
                typehint: 'NoteError'
              }
          }]
        }
        const newScalaNotesEvent4: NewScalaNotes = {
            typehint: 'NewScalaNotesEvent',
            isFull: false,
            notes: [{
              beg: 190,
              line: 7,
              col: 22,
              end: 197,
              file: targetFile,
              msg: 'not found: value Success',
              severity: {
                typehint: 'NoteError'
              }
          }]
        }
        const newScalaNotesEvent5: NewScalaNotes = {
            typehint: 'NewScalaNotesEvent',
            isFull: false,
            notes: [{
              beg: 18,
              line: 2,
              col: 38,
              end: 39,
              file: targetFile,
              msg: 'Unused import',
              severity: {
                typehint: 'NoteWarn'
              }
          }]
        }
        const fullTypeCheckCompleteEvent: FullTypeCheckComplete = {
            typehint: 'FullTypeCheckCompleteEvent'
        }

        const events = expectEvents(api, [
            clearAllScalaNotesEvent,
            newScalaNotesEvent1,
            newScalaNotesEvent2,
            newScalaNotesEvent3,
            newScalaNotesEvent4,
            newScalaNotesEvent5,
            fullTypeCheckCompleteEvent])

        const typecheckFileRes = await api.typecheckFile(targetFile)
        expect(typecheckFileRes).toEqual(voidResponse)
        events.then(() => done())
    })

    it('should typecheck buffer', async done => {
        const targetFile = instance.pathOf(path.join('src', 'main', 'scala', 'Test_Typecheck_File.scala'))

        const clearAllScalaNotesEvent: ClearAllScalaNotes = {
            typehint: 'ClearAllScalaNotesEvent'
        }
        const fullTypeCheckCompleteEvent: FullTypeCheckComplete = {
            typehint: 'FullTypeCheckCompleteEvent'
        }

        const events = expectEvents(api, [
            clearAllScalaNotesEvent,
            fullTypeCheckCompleteEvent])

        const typecheckFileRes = await api.typecheckBuffer(targetFile, `
            import scala.util._
            object Main {
              def main(args: Array[String]): Unit = {
                val userName: String = "Martin"
                Success(userName)
              }
            }
        `)
        expect(typecheckFileRes).toEqual(voidResponse)
        events.then(() => done())
    })
})
