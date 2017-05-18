import * as path from 'path'
import * as temp from 'temp'

import loglevel = require('loglevel')
import {Api} from '../lib/server-api/server-api'
import {ServerConnection} from '../lib/server-api/server-connection'
import {AnalyzerReady, Event, FullTypeCheckComplete, IndexerReady, SendBackgroundMessage} from '../lib/server-api/server-protocol'
import {expectEvents, setupProject, ProjectRef} from './utils'

const log = loglevel.getLogger('server-api')

describe('Server API', () => {
    let project: ProjectRef
    let api: Api
    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200000

    beforeAll(done => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 2000000
        originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL
        setupProject().then(projRef => {
            project = projRef
            api = projRef.api

            return project.addFiles({
             [path.join('src', 'main', 'scala', 'Test_Types.scala')]: 'case class User(name: String, age: Int)',
             [path.join('src', 'main', 'scala', 'Test_Import_Suggestions.scala')]: 'Success("Test")'
         }).then(() =>  done())
        })
    })

    afterAll(done => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout
        project.clean().then(() => done())
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
        const targetFile = project.pathOf(path.join('src', 'main', 'scala', 'Test_Types.scala'))
        const typeAtPointRes = await api.getTypeAtPoint(targetFile, 11, 15)
        expect(typeAtPointRes).toEqual({
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
        })
        done()
    })

    it('should get import suggestionsRes', async done => {
        const targetFile = project.pathOf(path.join('src', 'main', 'scala', 'Test_Import_Suggestions.scala'))
        const importSuggestionsRes = await api.getImportSuggestions(targetFile, 0, 'Success')
        expect(importSuggestionsRes).toEqual({
            typehint: 'ImportSuggestions',
            symLists: [[{
                name: 'scala.util.Success',
                localName: 'Success',
                pos: {
                    typehint: 'LineSourcePosition',
                    file: project.pathOf(path.join('.ensime_cache', 'dep-src', 'source-jars', 'scala', 'util', 'Try.scala')),
                    line: 225
                },
                typehint: 'TypeSearchResult',
                declAs: {
                    typehint: 'Class'
                }
            }]]
        })
        done()
    })
})
