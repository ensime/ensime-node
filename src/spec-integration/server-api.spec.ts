/* tslint:disable max-line-length no-console */
import * as path from 'path'
import * as temp from 'temp'

import { readFile } from '../lib/file-utils'

import loglevel = require('loglevel')
import {EnsimeInstance} from '../lib/instance'
import {Api} from '../lib/server-api/server-api'
import {ServerConnection} from '../lib/server-api/server-connection'
import {
    AnalyzerReady,
    ClearAllScalaNotes,
    CompletionsResponse,
    Event,
    FullTypeCheckComplete,
    ImplicitInfo,
    ImplicitInfos,
    ImportSuggestions,
    IndexerReady,
    NewScalaNotes,
    Note,
    OrganiseImportsRefactorDesc,
    RefactorDiffEffect,
    SendBackgroundMessage,
    TypeInfo,
    Void
} from '../lib/server-api/server-protocol'
import {expectEvents, setupProject, stripMargin} from './utils'

const log = loglevel.getLogger('server-api')
loglevel.setDefaultLevel(LogLevel.INFO)
loglevel.setLevel('trace')

const voidResponse: Void = { typehint: 'VoidResponse' }

const CUSTOM_TIMEOUT_INTERVAL = 60000
const MAX_SAFE_TIMEOUT = Math.pow(2, 31) - 1

process.on('unhandledRejection', error => {
  // Prints "unhandledRejection woops!"
  const util = require('util')

  console.log(util.inspect(error))

  console.error('unhandledRejection', error)
})

describe('Server API', () => {
    let instance: EnsimeInstance<any>
    let api: Api

    const originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL
    jasmine.DEFAULT_TIMEOUT_INTERVAL = CUSTOM_TIMEOUT_INTERVAL

    beforeAll(async done => {
        instance = await setupProject()
        api = instance.api
        await instance.addFiles({
            [path.join('src', 'main', 'scala', 'Test_Types.scala')]: 'case class User(name: String, age: Int)',
            [path.join('src', 'main', 'scala', 'Test_Import_Suggestions.scala')]: 'Success("Test")',
            [path.join('src', 'main', 'scala', 'Test_Typecheck_File.scala')]: stripMargin`
              |  import scala.utilss._
              |
              |  object Main {
              |    def main(args: Array[String]) {
              |     val userName: String = 2
              |     Success(userName)
              |    }
              |  }
            `,
            [path.join('src', 'main', 'scala', 'Test_Completitions.scala')]: 'object Test_Completitions { scala.concurrent.Future. }',
            [path.join('src', 'main', 'scala', 'Test_Refactor_Patch_Org_Imports.scala')]: stripMargin`
              | import scala._
              | import java.lang.Integer
              | import scala.Int
              | import java._
              |
              | trait Temp {
              |   def i(): Int
              |   def j(): Integer
              | }
            `
        })
        done()
    }, MAX_SAFE_TIMEOUT)

    afterAll(done => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout
        instance.destroy().then(() => done(), err => done.fail(err))
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
        expect(connectionInfoRes).toEqual({ typehint: 'ConnectionInfo', implementation: { name: 'ENSIME' }, version: '1.9.1' } as any)
        await events.then(() => done())
    })

    it('should get type at point', done => {
        (async () => {
            const targetFile = instance.pathOf(path.join('src', 'main', 'scala', 'Test_Types.scala'))
            const expectedTypeAtPointRes: any = {
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
        })().catch(done.fail)
    })

    it('should get import suggestions', done => {
        (async () => {
            const targetFile = instance.pathOf(path.join('src', 'main', 'scala', 'Test_Import_Suggestions.scala'))
            const expectedimportSuggestionsRes: any = {
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
        })().catch(done.fail)
    })

    it('should typecheck file', done => {
        (async () => {
            const targetFile = instance.pathOf(path.join('src', 'main', 'scala', 'Test_Typecheck_File.scala'))

            const clearAllScalaNotesEvent: ClearAllScalaNotes = {
                typehint: 'ClearAllScalaNotesEvent'
            }
            const newScalaNotesEvent1: NewScalaNotes = {
                typehint: 'NewScalaNotesEvent',
                isFull: false,
                notes: [{
                    beg: 76,
                    line: 5,
                    col: 35,
                    end: 76,
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
                    beg: 10,
                    line: 2,
                    col: 16,
                    end: 22,
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
                    beg: 106,
                    line: 6,
                    col: 29,
                    end: 107,
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
                    beg: 113,
                    line: 7,
                    col: 6,
                    end: 120,
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
                    beg: 3,
                    line: 2,
                    col: 23,
                    end: 24,
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
            await events
            done()
        })().catch(done.fail)
    })

    it('should typecheck buffer', done => {
        (async () => {
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
            await events
            done()
        })().catch(done.fail)
    })

    it('should get completions', done => {
        (async () => {
            const targetFile = instance.pathOf(path.join('src', 'main', 'scala', 'Test_Completitions.scala'))
            const targetFileContent = await readFile(targetFile).then(raw => raw.toString())
            const completionsRes: CompletionsResponse = await api.getCompletions(targetFile, targetFileContent, 52, 3)

            expect(completionsRes).toEqual({
              typehint: 'CompletionInfoList',
              prefix: '',
              completions: [
                {
                  typeInfo: {
                    resultType: {
                      name: 'Future[R]',
                      fullName: 'scala.concurrent.Future[scala.concurrent.Future.R]',
                      typehint: 'BasicTypeInfo',
                      typeParams: [],
                      typeArgs: [
                        {
                          name: 'R',
                          fullName: 'scala.concurrent.Future.R',
                          typehint: 'BasicTypeInfo',
                          typeParams: [],
                          typeArgs: [],
                          members: [],
                          declAs: {
                            typehint: 'Nil'
                          }
                        }
                      ],
                      members: [],
                      declAs: {
                        typehint: 'Trait'
                      }
                    },
                    name: '(TraversableOnce[Future[T]]) => (R) => ((R, T) => R) => (ExecutionContext) => Future[R]',
                    paramSections: [
                      {
                        params: [
                          [
                            'futures',
                            {
                              name: 'TraversableOnce[Future[T]]',
                              fullName: 'scala.collection.TraversableOnce[scala.concurrent.Future[scala.concurrent.Future.T]]',
                              typehint: 'BasicTypeInfo',
                              typeParams: [],
                              typeArgs: [
                                {
                                  name: 'Future[T]',
                                  fullName: 'scala.concurrent.Future[scala.concurrent.Future.T]',
                                  typehint: 'BasicTypeInfo',
                                  typeParams: [],
                                  typeArgs: [
                                    {
                                      name: 'T',
                                      fullName: 'scala.concurrent.Future.T',
                                      typehint: 'BasicTypeInfo',
                                      typeParams: [],
                                      typeArgs: [],
                                      members: [],
                                      declAs: {
                                        typehint: 'Nil'
                                      }
                                    }
                                  ],
                                  members: [],
                                  declAs: {
                                    typehint: 'Trait'
                                  }
                                }
                              ],
                              members: [],
                              declAs: {
                                typehint: 'Trait'
                              }
                            }
                          ]
                        ],
                        isImplicit: false
                      },
                      {
                        params: [
                          [
                            'zero',
                            {
                              name: 'R',
                              fullName: 'scala.concurrent.Future.R',
                              typehint: 'BasicTypeInfo',
                              typeParams: [],
                              typeArgs: [],
                              members: [],
                              declAs: {
                                typehint: 'Nil'
                              }
                            }
                          ]
                        ],
                        isImplicit: false
                      },
                      {
                        params: [
                          [
                            'op',
                            {
                              resultType: {
                                name: 'R',
                                fullName: 'scala.concurrent.Future.R',
                                typehint: 'BasicTypeInfo',
                                typeParams: [],
                                typeArgs: [],
                                members: [],
                                declAs: {
                                  typehint: 'Nil'
                                }
                              },
                              name: '(R, T) => R',
                              paramSections: [
                                {
                                  params: [
                                    [
                                      '_0',
                                      {
                                        name: 'R',
                                        fullName: 'scala.concurrent.Future.R',
                                        typehint: 'BasicTypeInfo',
                                        typeParams: [],
                                        typeArgs: [],
                                        members: [],
                                        declAs: {
                                          typehint: 'Nil'
                                        }
                                      }
                                    ],
                                    [
                                      '_1',
                                      {
                                        name: 'T',
                                        fullName: 'scala.concurrent.Future.T',
                                        typehint: 'BasicTypeInfo',
                                        typeParams: [],
                                        typeArgs: [],
                                        members: [],
                                        declAs: {
                                          typehint: 'Nil'
                                        }
                                      }
                                    ]
                                  ],
                                  isImplicit: false
                                }
                              ],
                              fullName: '(scala.concurrent.Future.R, scala.concurrent.Future.T) => scala.concurrent.Future.R',
                              typehint: 'ArrowTypeInfo',
                              typeParams: []
                            }
                          ]
                        ],
                        isImplicit: false
                      },
                      {
                        params: [
                          [
                            'executor',
                            {
                              name: 'ExecutionContext',
                              fullName: 'scala.concurrent.ExecutionContext',
                              typehint: 'BasicTypeInfo',
                              typeParams: [],
                              typeArgs: [],
                              members: [],
                              declAs: {
                                typehint: 'Trait'
                              }
                            }
                          ]
                        ],
                        isImplicit: true
                      }
                    ],
                    fullName: '(scala.collection.TraversableOnce[scala.concurrent.Future[scala.concurrent.Future.T]]) => (scala.concurrent.Future.R) => ((scala.concurrent.Future.R, scala.concurrent.Future.T) => scala.concurrent.Future.R) => (scala.concurrent.ExecutionContext) => scala.concurrent.Future[scala.concurrent.Future.R]',
                    typehint: 'ArrowTypeInfo',
                    typeParams: [
                      {
                        name: 'T',
                        fullName: 'scala.concurrent.Future.T',
                        typehint: 'BasicTypeInfo',
                        typeParams: [],
                        typeArgs: [],
                        members: [],
                        declAs: {
                          typehint: 'Nil'
                        }
                      },
                      {
                        name: 'R',
                        fullName: 'scala.concurrent.Future.R',
                        typehint: 'BasicTypeInfo',
                        typeParams: [],
                        typeArgs: [],
                        members: [],
                        declAs: {
                          typehint: 'Nil'
                        }
                      }
                    ]
                  },
                  name: 'fold',
                  relevance: 90,
                  isInfix: false
                },
                {
                  typeInfo: {
                    resultType: {
                      name: 'Future[Option[T]]',
                      fullName: 'scala.concurrent.Future[scala.Option[scala.concurrent.Future.T]]',
                      typehint: 'BasicTypeInfo',
                      typeParams: [],
                      typeArgs: [
                        {
                          name: 'Option[T]',
                          fullName: 'scala.Option[scala.concurrent.Future.T]',
                          typehint: 'BasicTypeInfo',
                          typeParams: [],
                          typeArgs: [
                            {
                              name: 'T',
                              fullName: 'scala.concurrent.Future.T',
                              typehint: 'BasicTypeInfo',
                              typeParams: [],
                              typeArgs: [],
                              members: [],
                              declAs: {
                                typehint: 'Nil'
                              }
                            }
                          ],
                          members: [],
                          declAs: {
                            typehint: 'Class'
                          }
                        }
                      ],
                      members: [],
                      declAs: {
                        typehint: 'Trait'
                      }
                    },
                    name: '(TraversableOnce[Future[T]]) => ((T) => Boolean) => (ExecutionContext) => Future[Option[T]]',
                    paramSections: [
                      {
                        params: [
                          [
                            'futures',
                            {
                              name: 'TraversableOnce[Future[T]]',
                              fullName: 'scala.collection.TraversableOnce[scala.concurrent.Future[scala.concurrent.Future.T]]',
                              typehint: 'BasicTypeInfo',
                              typeParams: [],
                              typeArgs: [
                                {
                                  name: 'Future[T]',
                                  fullName: 'scala.concurrent.Future[scala.concurrent.Future.T]',
                                  typehint: 'BasicTypeInfo',
                                  typeParams: [],
                                  typeArgs: [
                                    {
                                      name: 'T',
                                      fullName: 'scala.concurrent.Future.T',
                                      typehint: 'BasicTypeInfo',
                                      typeParams: [],
                                      typeArgs: [],
                                      members: [],
                                      declAs: {
                                        typehint: 'Nil'
                                      }
                                    }
                                  ],
                                  members: [],
                                  declAs: {
                                    typehint: 'Trait'
                                  }
                                }
                              ],
                              members: [],
                              declAs: {
                                typehint: 'Trait'
                              }
                            }
                          ]
                        ],
                        isImplicit: false
                      },
                      {
                        params: [
                          [
                            'p',
                            {
                              resultType: {
                                name: 'Boolean',
                                fullName: 'scala.Boolean',
                                typehint: 'BasicTypeInfo',
                                typeParams: [],
                                typeArgs: [],
                                members: [],
                                declAs: {
                                  typehint: 'Class'
                                }
                              },
                              name: '(T) => Boolean',
                              paramSections: [
                                {
                                  params: [
                                    [
                                      '_0',
                                      {
                                        name: 'T',
                                        fullName: 'scala.concurrent.Future.T',
                                        typehint: 'BasicTypeInfo',
                                        typeParams: [],
                                        typeArgs: [],
                                        members: [],
                                        declAs: {
                                          typehint: 'Nil'
                                        }
                                      }
                                    ]
                                  ],
                                  isImplicit: false
                                }
                              ],
                              fullName: '(scala.concurrent.Future.T) => scala.Boolean',
                              typehint: 'ArrowTypeInfo',
                              typeParams: []
                            }
                          ]
                        ],
                        isImplicit: false
                      },
                      {
                        params: [
                          [
                            'executor',
                            {
                              name: 'ExecutionContext',
                              fullName: 'scala.concurrent.ExecutionContext',
                              typehint: 'BasicTypeInfo',
                              typeParams: [],
                              typeArgs: [],
                              members: [],
                              declAs: {
                                typehint: 'Trait'
                              }
                            }
                          ]
                        ],
                        isImplicit: true
                      }
                    ],
                    fullName: '(scala.collection.TraversableOnce[scala.concurrent.Future[scala.concurrent.Future.T]]) => ((scala.concurrent.Future.T) => scala.Boolean) => (scala.concurrent.ExecutionContext) => scala.concurrent.Future[scala.Option[scala.concurrent.Future.T]]',
                    typehint: 'ArrowTypeInfo',
                    typeParams: [
                      {
                        name: 'T',
                        fullName: 'scala.concurrent.Future.T',
                        typehint: 'BasicTypeInfo',
                        typeParams: [],
                        typeArgs: [],
                        members: [],
                        declAs: {
                          typehint: 'Nil'
                        }
                      }
                    ]
                  },
                  name: 'find',
                  relevance: 90,
                  isInfix: false
                },
                {
                  typeInfo: {
                    resultType: {
                      name: 'Future[T]',
                      fullName: 'scala.concurrent.Future[scala.concurrent.Future.T]',
                      typehint: 'BasicTypeInfo',
                      typeParams: [],
                      typeArgs: [
                        {
                          name: 'T',
                          fullName: 'scala.concurrent.Future.T',
                          typehint: 'BasicTypeInfo',
                          typeParams: [],
                          typeArgs: [],
                          members: [],
                          declAs: {
                            typehint: 'Nil'
                          }
                        }
                      ],
                      members: [],
                      declAs: {
                        typehint: 'Trait'
                      }
                    },
                    name: '(=> T) => (ExecutionContext) => Future[T]',
                    paramSections: [
                      {
                        params: [
                          [
                            'body',
                            {
                              resultType: {
                                name: 'T',
                                fullName: 'scala.concurrent.Future.T',
                                typehint: 'BasicTypeInfo',
                                typeParams: [],
                                typeArgs: [],
                                members: [],
                                declAs: {
                                  typehint: 'Nil'
                                }
                              },
                              name: '=> T',
                              paramSections: [],
                              fullName: '=> scala.concurrent.Future.T',
                              typehint: 'ArrowTypeInfo',
                              typeParams: []
                            }
                          ]
                        ],
                        isImplicit: false
                      },
                      {
                        params: [
                          [
                            'executor',
                            {
                              name: 'ExecutionContext',
                              fullName: 'scala.concurrent.ExecutionContext',
                              typehint: 'BasicTypeInfo',
                              typeParams: [],
                              typeArgs: [],
                              members: [],
                              declAs: {
                                typehint: 'Trait'
                              }
                            }
                          ]
                        ],
                        isImplicit: true
                      }
                    ],
                    fullName: '(=> scala.concurrent.Future.T) => (scala.concurrent.ExecutionContext) => scala.concurrent.Future[scala.concurrent.Future.T]',
                    typehint: 'ArrowTypeInfo',
                    typeParams: [
                      {
                        name: 'T',
                        fullName: 'scala.concurrent.Future.T',
                        typehint: 'BasicTypeInfo',
                        typeParams: [],
                        typeArgs: [],
                        members: [],
                        declAs: {
                          typehint: 'Nil'
                        }
                      }
                    ]
                  },
                  name: 'apply',
                  relevance: 90,
                  isInfix: false
                }
              ]
            } as any)

            done()
        })().catch(done.fail)
    })

    it('should refactor patch organize imports', done => {
        (async () => {
            const targetFile = instance.pathOf(path.join('src', 'main', 'scala', 'Test_Refactor_Patch_Org_Imports.scala'))

            const newScalaNotesEvent: NewScalaNotes = {
                typehint: 'NewScalaNotesEvent',
                isFull: false,
                notes: [{
                    beg: 62,
                    line: 5,
                    col: 14,
                    end: 75,
                    file: targetFile,
                    msg: 'Unused import',
                    severity: {
                        typehint: 'NoteWarn'
                    }
                }]
            }
            const clearAllScalaNotesEvent: ClearAllScalaNotes = {
                typehint: 'ClearAllScalaNotesEvent'
            }

            const events = expectEvents(api, [
                newScalaNotesEvent,
                clearAllScalaNotesEvent])

            const params: any = {
                typehint: 'OrganiseImportsRefactorDesc',
                refactorType: {
                    typehint: 'OrganizeImports'
                },
                file: targetFile
            }
            const refactoringPatchRes: any = await api.getRefactoringPatch(1, params)
            expect(refactoringPatchRes.typehint).toEqual('RefactorDiffEffect')
            expect(refactoringPatchRes.procedureId).toEqual(1)
            expect(refactoringPatchRes.refactorType.typehint).toEqual('OrganizeImports')
            expect(refactoringPatchRes.typehint).toEqual('RefactorDiffEffect')
            expect(refactoringPatchRes.diff).toBeTruthy()

            const raw = await readFile(refactoringPatchRes.diff)
            const diffLines = raw.toString().split('\n')

            expect(diffLines[4]).toEqual('- import scala._')
            expect(diffLines[5]).toEqual('- import java.lang.Integer')
            expect(diffLines[6]).toEqual('- import scala.Int')
            expect(diffLines[7]).toEqual('  import java._')
            expect(diffLines[8]).toEqual('+ import java.lang.Integer')
            expect(diffLines[9]).toEqual(' ')
            expect(diffLines[10]).toEqual('+ import scala._')
            expect(diffLines[11]).toEqual('+')

            await events
            done()
        })().catch(done.fail)
    })
})
