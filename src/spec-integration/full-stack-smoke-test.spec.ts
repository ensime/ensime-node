import fs from 'fs-extra'
import * as path from 'path'
import { readFile, writeFile } from '../lib/file-utils'

import * as temp from 'temp'

import loglevel = require('loglevel')
import Promise = require('bluebird')
import {spawn} from 'child_process'
import {
    clientStarterFromServerStarter,
    dotEnsimeUtils,
    pid,
    startServerFromAssemblyJar,
    startServerFromDotEnsimeCP,
    DotEnsime,
    ServerStarter,
} from '../lib/index'
import {ServerConnection} from '../lib/server-api/server-connection'
import {setupProject, ProjectRef} from './utils'

const log = loglevel.getLogger('full-stack-smoke')

describe('full-stack-smoke', () => {
    let project: ProjectRef
    let client: ServerConnection
    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200000

    beforeAll(done => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 2000000
        originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL
        setupProject().then(projRef => {
            project = projRef
            client = projRef.client
            done()
        })
    })

    afterAll(done => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout
        project.clean()
        done()
    })

    it('should get connection info', done => {
        const fooDotScala = path.join(project.path, 'src', 'main', 'scala', 'Foo.scala')
        const content = `
            object Foo {
                def bar = "baz";
            }
        `
        writeFile(fooDotScala, content)
        client.post({ typehint: 'ConnectionInfoReq' }).then(res => {
            expect(res).toEqual({ typehint: 'ConnectionInfo', implementation: {name: 'ENSIME' }, version: '1.9.1' })
            done()
        })
    })
})
