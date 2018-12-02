import { formatImplicitInfo, formatType, typeConstructorFromName, typeConstructorFromType } from '../lib/formatting'
import { fromLisp, readFromString } from '../lib/lisp/lisp'

describe('typeConstructorFromName', () => {
  it('should strip type args', () => {
    expect(typeConstructorFromName('Thing[T]')).toBe('Thing')
  })

  it('should not mess up when nested arguments', () => {
    expect(typeConstructorFromName('Seq[(ActivityRow, Option[AdminRow], Option[ParticipantCardRow])]')).toBe('Seq')
  })
})

describe('formatType', () => {
  it('should format Rep[Int] correctly', () => {
    const type = {
      name: 'Rep[Int]',
      fullName: 'slick.lifted.Rep[scala.Int]',
      typehint: 'BasicTypeInfo',
      typeArgs: [
        {
          name: 'Int',
          fullName: 'scala.Int',
          typehint: 'BasicTypeInfo',
          typeArgs: [],
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
    }

    expect(typeConstructorFromType(type)).toBe('Rep')
    expect(formatType(type)).toBe('Rep[Int]')
  })

  it('should use simple name for type param', () => {
    const typeStr = `\
    {
      "name": "A",
      "fullName": "scalaz.std.A",
      "typehint": "BasicTypeInfo",
      "typeId": 37,
      "typeArgs": [],
      "members": [],
      "declAs": {
        "typehint": "Nil"
      }
    }\
    `

    const type = JSON.parse(typeStr)
    expect(formatType(type)).toBe('A')
  })

  it('should format by-name with arrow', () => {
    const type = {
      name: '<byname>',
      fullName: 'scala.<byname>',
      typehint: 'BasicTypeInfo',
      typeId: 2861,
      typeArgs: [
        {
          name: 'T',
          fullName: 'net.liftweb.util.T',
          typehint: 'BasicTypeInfo',
          typeId: 2862,
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
    expect(formatType(type)).toBe('=> T')
  })

  it('should format <repeated>[X] as X*', () => {
    const type = {
      name: '<repeated>',
      fullName: 'scala.<repeated>',
      typehint: 'BasicTypeInfo',
      typeArgs: [
        {
          name: 'ColumnOption',
          fullName: 'slick.ast.ColumnOption',
          typehint: 'BasicTypeInfo',
          typeArgs: [
            {
              name: 'C',
              fullName: 'slick.profile.C',
              typehint: 'BasicTypeInfo',
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
        typehint: 'Class'
      }
    }
    expect(formatType(type)).toBe('ColumnOption[C]*')
  })

  it('should format implicit params', () => {
    const input: any = {
      params: [
        {
          name: 'y',
          localName: 'y',
          declPos: {
            typehint: 'OffsetSourcePosition',
            file: '/Users/viktor/dev/projects/ensime-test-project/src/main/scala/Foo.scala',
            offset: 547
          },
          type: {
            name: 'Int',
            fullName: 'scala.Int',
            pos: {
              typehint: 'OffsetSourcePosition',
              file: '/Users/viktor/dev/projects/ensime-test-project/.ensime_cache/dep-src/source-jars/scala/Int.scala',
              offset: 1093
            },
            typehint: 'BasicTypeInfo',
            typeId: 14,
            typeArgs: [],
            members: [],
            declAs: {
              typehint: 'Class'
            }
          },
          isCallable: false,
          ownerTypeId: 16
        },
        {
          name: 'y',
          localName: 'y',
          declPos: {
            typehint: 'OffsetSourcePosition',
            file: '/Users/viktor/dev/projects/ensime-test-project/src/main/scala/Foo.scala',
            offset: 547
          },
          type: {
            name: 'Int',
            fullName: 'scala.Int',
            pos: {
              typehint: 'OffsetSourcePosition',
              file: '/Users/viktor/dev/projects/ensime-test-project/.ensime_cache/dep-src/source-jars/scala/Int.scala',
              offset: 1093
            },
            typehint: 'BasicTypeInfo',
            typeId: 14,
            typeArgs: [],
            members: [],
            declAs: {
              typehint: 'Class'
            }
          },
          isCallable: false,
          ownerTypeId: 16
        }
      ],
      typehint: 'ImplicitParamInfo',
      fun: {
        name: 'curried',
        localName: 'curried',
        declPos: {
          typehint: 'OffsetSourcePosition',
          file: '/Users/viktor/dev/projects/ensime-test-project/src/main/scala/Foo.scala',
          offset: 421
        },
        type: {
          resultType: {
            name: 'Int',
            fullName: 'scala.Int',
            typehint: 'BasicTypeInfo',
            typeId: 14,
            typeArgs: [],
            members: [],
            declAs: {
              typehint: 'Class'
            }
          },
          name: '(x: Int)(implicit y: Int, implicit z: Int)Int',
          paramSections: [
            {
              params: [
                [
                  'x',
                  {
                    name: 'Int',
                    fullName: 'scala.Int',
                    typehint: 'BasicTypeInfo',
                    typeId: 14,
                    typeArgs: [],
                    members: [],
                    declAs: {
                      typehint: 'Class'
                    }
                  }
                ]
              ],
              isImplicit: false
            },
            {
              params: [
                [
                  'y',
                  {
                    name: 'Int',
                    fullName: 'scala.Int',
                    typehint: 'BasicTypeInfo',
                    typeId: 14,
                    typeArgs: [],
                    members: [],
                    declAs: {
                      typehint: 'Class'
                    }
                  }
                ],
                [
                  'z',
                  {
                    name: 'Int',
                    fullName: 'scala.Int',
                    typehint: 'BasicTypeInfo',
                    typeId: 14,
                    typeArgs: [],
                    members: [],
                    declAs: {
                      typehint: 'Class'
                    }
                  }
                ]
              ],
              isImplicit: true
            }
          ],
          typehint: 'ArrowTypeInfo',
          typeId: 4367
        },
        isCallable: true,
        ownerTypeId: 16
      },
      funIsImplicit: false,
      end: 574,
      start: 564
    }
    const result = formatImplicitInfo(input)
    expect(result).toBe('Implicit parameters added to call of curried: (y, y)')
  })

  it('should format implicit conversion', () => {
    const input = {
      typehint: 'ImplicitConversionInfo',
      start: 604,
      end: 611,
      fun: {
        name: 'ToApplyOps',
        localName: 'ToApplyOps',
        declPos: {
          typehint: 'OffsetSourcePosition',
          file: '/Users/viktor/dev/projects/ensime-test-project/.ensime_cache/dep-src/source-jars/scalaz/syntax/ApplySyntax.scala',
          offset: 1568
        },
        type: {
          resultType: {
            name: 'ApplyOps',
            fullName: 'scalaz.syntax.ApplyOps',
            typehint: 'BasicTypeInfo',
            typeId: 304,
            typeArgs: [
              {
                name: 'F',
                fullName: 'scalaz.syntax.F',
                typehint: 'BasicTypeInfo',
                typeId: 302,
                typeArgs: [],
                members: [],
                declAs: {
                  typehint: 'Nil'
                }
              },
              {
                name: 'A',
                fullName: 'scalaz.syntax.A',
                typehint: 'BasicTypeInfo',
                typeId: 300,
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
          },
          name: '[F[_], A](v: F[A])(implicit F0: scalaz.Apply[F])scalaz.syntax.ApplyOps[F,A]',
          paramSections: [
            {
              params: [
                [
                  'v',
                  {
                    name: 'F',
                    fullName: 'scalaz.syntax.F',
                    typehint: 'BasicTypeInfo',
                    typeId: 299,
                    typeArgs: [
                      {
                        name: 'A',
                        fullName: 'scalaz.syntax.A',
                        typehint: 'BasicTypeInfo',
                        typeId: 300,
                        typeArgs: [],
                        members: [],
                        declAs: {
                          typehint: 'Nil'
                        }
                      }
                    ],
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
                  'F0',
                  {
                    name: 'Apply',
                    fullName: 'scalaz.Apply',
                    typehint: 'BasicTypeInfo',
                    typeId: 301,
                    typeArgs: [
                      {
                        name: 'F',
                        fullName: 'scalaz.syntax.F',
                        typehint: 'BasicTypeInfo',
                        typeId: 302,
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
                ]
              ],
              isImplicit: true
            }
          ],
          typehint: 'ArrowTypeInfo',
          typeId: 303
        },
        isCallable: true,
        ownerTypeId: 34
      }
    }
    const result = formatImplicitInfo(input)
    expect(result).toBe('Implicit conversion: ToApplyOps')
  })

  it('should handle FunctionX with arrow notation', () => {
    const input = {
      name: 'Function1',
      fullName: 'scala.Function1',
      typehint: 'BasicTypeInfo',
      typeId: 4464,
      typeArgs: [
        {
          name: 'Int',
          fullName: 'scala.Int',
          typehint: 'BasicTypeInfo',
          typeId: 14,
          typeArgs: [],
          members: [],
          declAs: {
            typehint: 'Class'
          }
        },
        {
          name: 'Double',
          fullName: 'scala.Double',
          typehint: 'BasicTypeInfo',
          typeId: 2600,
          typeArgs: [],
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
    }
    const result = formatType(input)
    expect(result).toBe('Int => Double')
  })

  it('should format typeargs with tuples correctly', () => {
    const type = {
      name: 'Seq[(ActivityRow, Option[AdminRow], Option[ParticipantCardRow])]',
      fullName: 'scala.collection.Seq[(se.uniply.dfkka.db.TableDefinitions.ActivityRow, scala.Option[se.uniply.dfkka.db.TableDefinitions.AdminRow],' +
       ' scala.Option[se.uniply.dfkka.db.TableDefinitions.ParticipantCardRow])]',
      pos: {
        typehint: 'OffsetSourcePosition',
        file: '/Users/viktor/dev/projects/uniply-batch/.ensime_cache/dep-src/source-jars/scala/collection/Seq.scala',
        offset: 656
      },
      typehint: 'BasicTypeInfo',
      typeArgs: [
        {
          name: '(ActivityRow, Option[AdminRow], Option[ParticipantCardRow])',
          fullName: '(se.uniply.dfkka.db.TableDefinitions.ActivityRow, scala.Option[se.uniply.dfkka.db.TableDefinitions.AdminRow], ' +
           'scala.Option[se.uniply.dfkka.db.TableDefinitions.ParticipantCardRow])',
          typehint: 'BasicTypeInfo',
          typeArgs: [
            {
              name: 'ActivityRow',
              fullName: 'se.uniply.dfkka.db.TableDefinitions.ActivityRow',
              typehint: 'BasicTypeInfo',
              typeArgs: [],
              members: [],
              declAs: {
                typehint: 'Class'
              }
            },
            {
              name: 'Option[AdminRow]',
              fullName: 'scala.Option[se.uniply.dfkka.db.TableDefinitions.AdminRow]',
              typehint: 'BasicTypeInfo',
              typeArgs: [
                {
                  name: 'AdminRow',
                  fullName: 'se.uniply.dfkka.db.TableDefinitions.AdminRow',
                  typehint: 'BasicTypeInfo',
                  typeArgs: [],
                  members: [],
                  declAs: {
                    typehint: 'Class'
                  }
                }
              ],
              members: [],
              declAs: {
                typehint: 'Class'
              }
            },
            {
              name: 'Option[ParticipantCardRow]',
              fullName: 'scala.Option[se.uniply.dfkka.db.TableDefinitions.ParticipantCardRow]',
              typehint: 'BasicTypeInfo',
              typeArgs: [
                {
                  name: 'ParticipantCardRow',
                  fullName: 'se.uniply.dfkka.db.TableDefinitions.ParticipantCardRow',
                  typehint: 'BasicTypeInfo',
                  typeArgs: [],
                  members: [],
                  declAs: {
                    typehint: 'Class'
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
            typehint: 'Class'
          }
        }
      ],
      members: [],
      declAs: {
        typehint: 'Trait'
      }
    }

    const result = formatType(type)
    expect(result).toBe('Seq[(ActivityRow, Option[AdminRow], Option[ParticipantCardRow])]')
  })

  it('should format really big types too…?', () => {
    const type = {
      name: 'Query[(Rep[Long], Query[(Activity, Rep[Option[Admin]], Rep[Option[Participantcard]]), (ActivityRow, Option[AdminRow],' +
       ' Option[ParticipantCardRow]), Seq]), (Long, Query[(Activity, Rep[Option[Admin]], Rep[Option[Participantcard]]), ' +
       '(ActivityRow, Option[AdminRow], Option[ParticipantCardRow]), Seq]), Seq]',
      fullName: 'slick.lifted.Query[(slick.lifted.Rep[scala.Long], slick.lifted.Query[(se.uniply.dfkka.db.TableDefinitions.Activity,' +
       ' slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Admin]], ' +
       'slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Participantcard]]),' +
       ' (se.uniply.dfkka.db.TableDefinitions.ActivityRow, scala.Option[se.uniply.dfkka.db.TableDefinitions.AdminRow],' +
       ' scala.Option[se.uniply.dfkka.db.TableDefinitions.ParticipantCardRow]),' +
       ' scala.collection.Seq]), (scala.Long, slick.lifted.Query[(se.uniply.dfkka.db.TableDefinitions.Activity, ' +
       'slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Admin]],' +
       ' slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Participantcard]]), (se.uniply.dfkka.db.TableDefinitions.ActivityRow, ' +
       'scala.Option[se.uniply.dfkka.db.TableDefinitions.AdminRow], scala.Option[se.uniply.dfkka.db.TableDefinitions.ParticipantCardRow]),' +
       ' scala.collection.Seq]), scala.collection.Seq]',
      pos: {
        typehint: 'OffsetSourcePosition',
        file: '/Users/viktor/dev/projects/uniply-batch/.ensime_cache/dep-src/source-jars/slick/lifted/Query.scala',
        offset: 826
      },
      typehint: 'BasicTypeInfo',
      typeArgs: [
        {
          name: '(Rep[Long], Query[(Activity, Rep[Option[Admin]], Rep[Option[Participantcard]]), (ActivityRow, Option[AdminRow],' +
          ' Option[ParticipantCardRow]), Seq])',
          fullName: '(slick.lifted.Rep[scala.Long], slick.lifted.Query[(se.uniply.dfkka.db.TableDefinitions.Activity, ' +
          'slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Admin]], ' +
          'slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Participantcard]]), (se.uniply.dfkka.db.TableDefinitions.ActivityRow, ' +
          'scala.Option[se.uniply.dfkka.db.TableDefinitions.AdminRow], scala.Option[se.uniply.dfkka.db.TableDefinitions.ParticipantCardRow]),' +
          ' scala.collection.Seq])',
          typehint: 'BasicTypeInfo',
          typeArgs: [
            {
              name: 'Rep[Long]',
              fullName: 'slick.lifted.Rep[scala.Long]',
              typehint: 'BasicTypeInfo',
              typeArgs: [
                {
                  name: 'Long',
                  fullName: 'scala.Long',
                  typehint: 'BasicTypeInfo',
                  typeArgs: [],
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
            {
              name: 'Query[(Activity, Rep[Option[Admin]], Rep[Option[Participantcard]]), (ActivityRow, Option[AdminRow], Option[ParticipantCardRow]), Seq]',
              fullName: 'slick.lifted.Query[(se.uniply.dfkka.db.TableDefinitions.Activity, ' +
              'slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Admin]], ' +
              'slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Participantcard]]), (se.uniply.dfkka.db.TableDefinitions.ActivityRow, ' +
              'scala.Option[se.uniply.dfkka.db.TableDefinitions.AdminRow], scala.Option[se.uniply.dfkka.db.TableDefinitions.ParticipantCardRow]),' +
              ' scala.collection.Seq]',
              typehint: 'BasicTypeInfo',
              typeArgs: [
                {
                  name: '(Activity, Rep[Option[Admin]], Rep[Option[Participantcard]])',
                  fullName: '(se.uniply.dfkka.db.TableDefinitions.Activity, slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Admin]],' +
                  ' slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Participantcard]])',
                  typehint: 'BasicTypeInfo',
                  typeArgs: [
                    {
                      name: 'Activity',
                      fullName: 'se.uniply.dfkka.db.TableDefinitions.Activity',
                      typehint: 'BasicTypeInfo',
                      typeArgs: [],
                      members: [],
                      declAs: {
                        typehint: 'Class'
                      }
                    },
                    {
                      name: 'Rep[Option[Admin]]',
                      fullName: 'slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Admin]]',
                      typehint: 'BasicTypeInfo',
                      typeArgs: [
                        {
                          name: 'Option[Admin]',
                          fullName: 'scala.Option[se.uniply.dfkka.db.TableDefinitions.Admin]',
                          typehint: 'BasicTypeInfo',
                          typeArgs: [
                            {
                              name: 'Admin',
                              fullName: 'se.uniply.dfkka.db.TableDefinitions.Admin',
                              typehint: 'BasicTypeInfo',
                              typeArgs: [],
                              members: [],
                              declAs: {
                                typehint: 'Class'
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
                    {
                      name: 'Rep[Option[Participantcard]]',
                      fullName: 'slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Participantcard]]',
                      typehint: 'BasicTypeInfo',
                      typeArgs: [
                        {
                          name: 'Option[Participantcard]',
                          fullName: 'scala.Option[se.uniply.dfkka.db.TableDefinitions.Participantcard]',
                          typehint: 'BasicTypeInfo',
                          typeArgs: [
                            {
                              name: 'Participantcard',
                              fullName: 'se.uniply.dfkka.db.TableDefinitions.Participantcard',
                              typehint: 'BasicTypeInfo',
                              typeArgs: [],
                              members: [],
                              declAs: {
                                typehint: 'Class'
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
                    }
                  ],
                  members: [],
                  declAs: {
                    typehint: 'Class'
                  }
                },
                {
                  name: '(ActivityRow, Option[AdminRow], Option[ParticipantCardRow])',
                  fullName: '(se.uniply.dfkka.db.TableDefinitions.ActivityRow, scala.Option[se.uniply.dfkka.db.TableDefinitions.AdminRow], ' +
                  'scala.Option[se.uniply.dfkka.db.TableDefinitions.ParticipantCardRow])',
                  typehint: 'BasicTypeInfo',
                  typeArgs: [
                    {
                      name: 'ActivityRow',
                      fullName: 'se.uniply.dfkka.db.TableDefinitions.ActivityRow',
                      typehint: 'BasicTypeInfo',
                      typeArgs: [],
                      members: [],
                      declAs: {
                        typehint: 'Class'
                      }
                    },
                    {
                      name: 'Option[AdminRow]',
                      fullName: 'scala.Option[se.uniply.dfkka.db.TableDefinitions.AdminRow]',
                      typehint: 'BasicTypeInfo',
                      typeArgs: [
                        {
                          name: 'AdminRow',
                          fullName: 'se.uniply.dfkka.db.TableDefinitions.AdminRow',
                          typehint: 'BasicTypeInfo',
                          typeArgs: [],
                          members: [],
                          declAs: {
                            typehint: 'Class'
                          }
                        }
                      ],
                      members: [],
                      declAs: {
                        typehint: 'Class'
                      }
                    },
                    {
                      name: 'Option[ParticipantCardRow]',
                      fullName: 'scala.Option[se.uniply.dfkka.db.TableDefinitions.ParticipantCardRow]',
                      typehint: 'BasicTypeInfo',
                      typeArgs: [
                        {
                          name: 'ParticipantCardRow',
                          fullName: 'se.uniply.dfkka.db.TableDefinitions.ParticipantCardRow',
                          typehint: 'BasicTypeInfo',
                          typeArgs: [],
                          members: [],
                          declAs: {
                            typehint: 'Class'
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
                    typehint: 'Class'
                  }
                },
                {
                  name: 'Seq',
                  fullName: 'scala.collection.Seq',
                  typehint: 'BasicTypeInfo',
                  typeArgs: [],
                  members: [],
                  declAs: {
                    typehint: 'Trait'
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
            typehint: 'Class'
          }
        },
        {
          name: '(Long, Query[(Activity, Rep[Option[Admin]], Rep[Option[Participantcard]]), (ActivityRow, Option[AdminRow], Option[ParticipantCardRow]), Seq])',
          fullName: '(scala.Long, slick.lifted.Query[(se.uniply.dfkka.db.TableDefinitions.Activity, ' +
          'slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Admin]], ' +
          'slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Participantcard]]), (se.uniply.dfkka.db.TableDefinitions.ActivityRow, ' +
          'scala.Option[se.uniply.dfkka.db.TableDefinitions.AdminRow], scala.Option[se.uniply.dfkka.db.TableDefinitions.ParticipantCardRow]),' +
          ' scala.collection.Seq])',
          typehint: 'BasicTypeInfo',
          typeArgs: [
            {
              name: 'Long',
              fullName: 'scala.Long',
              typehint: 'BasicTypeInfo',
              typeArgs: [],
              members: [],
              declAs: {
                typehint: 'Class'
              }
            },
            {
              name: 'Query[(Activity, Rep[Option[Admin]], Rep[Option[Participantcard]]), (ActivityRow, Option[AdminRow], Option[ParticipantCardRow]), Seq]',
              fullName: 'slick.lifted.Query[(se.uniply.dfkka.db.TableDefinitions.Activity, ' +
              'slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Admin]], ' +
              'slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Participantcard]]), (se.uniply.dfkka.db.TableDefinitions.ActivityRow, ' +
              'scala.Option[se.uniply.dfkka.db.TableDefinitions.AdminRow], scala.Option[se.uniply.dfkka.db.TableDefinitions.ParticipantCardRow]), ' +
              'scala.collection.Seq]',
              typehint: 'BasicTypeInfo',
              typeArgs: [
                {
                  name: '(Activity, Rep[Option[Admin]], Rep[Option[Participantcard]])',
                  fullName: '(se.uniply.dfkka.db.TableDefinitions.Activity, slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Admin]], ' +
                  'slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Participantcard]])',
                  typehint: 'BasicTypeInfo',
                  typeArgs: [
                    {
                      name: 'Activity',
                      fullName: 'se.uniply.dfkka.db.TableDefinitions.Activity',
                      typehint: 'BasicTypeInfo',
                      typeArgs: [],
                      members: [],
                      declAs: {
                        typehint: 'Class'
                      }
                    },
                    {
                      name: 'Rep[Option[Admin]]',
                      fullName: 'slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Admin]]',
                      typehint: 'BasicTypeInfo',
                      typeArgs: [
                        {
                          name: 'Option[Admin]',
                          fullName: 'scala.Option[se.uniply.dfkka.db.TableDefinitions.Admin]',
                          typehint: 'BasicTypeInfo',
                          typeArgs: [
                            {
                              name: 'Admin',
                              fullName: 'se.uniply.dfkka.db.TableDefinitions.Admin',
                              typehint: 'BasicTypeInfo',
                              typeArgs: [],
                              members: [],
                              declAs: {
                                typehint: 'Class'
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
                    {
                      name: 'Rep[Option[Participantcard]]',
                      fullName: 'slick.lifted.Rep[scala.Option[se.uniply.dfkka.db.TableDefinitions.Participantcard]]',
                      typehint: 'BasicTypeInfo',
                      typeArgs: [
                        {
                          name: 'Option[Participantcard]',
                          fullName: 'scala.Option[se.uniply.dfkka.db.TableDefinitions.Participantcard]',
                          typehint: 'BasicTypeInfo',
                          typeArgs: [
                            {
                              name: 'Participantcard',
                              fullName: 'se.uniply.dfkka.db.TableDefinitions.Participantcard',
                              typehint: 'BasicTypeInfo',
                              typeArgs: [],
                              members: [],
                              declAs: {
                                typehint: 'Class'
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
                    }
                  ],
                  members: [],
                  declAs: {
                    typehint: 'Class'
                  }
                },
                {
                  name: '(ActivityRow, Option[AdminRow], Option[ParticipantCardRow])',
                  fullName: '(se.uniply.dfkka.db.TableDefinitions.ActivityRow, scala.Option[se.uniply.dfkka.db.TableDefinitions.AdminRow], ' +
                  'scala.Option[se.uniply.dfkka.db.TableDefinitions.ParticipantCardRow])',
                  typehint: 'BasicTypeInfo',
                  typeArgs: [
                    {
                      name: 'ActivityRow',
                      fullName: 'se.uniply.dfkka.db.TableDefinitions.ActivityRow',
                      typehint: 'BasicTypeInfo',
                      typeArgs: [],
                      members: [],
                      declAs: {
                        typehint: 'Class'
                      }
                    },
                    {
                      name: 'Option[AdminRow]',
                      fullName: 'scala.Option[se.uniply.dfkka.db.TableDefinitions.AdminRow]',
                      typehint: 'BasicTypeInfo',
                      typeArgs: [
                        {
                          name: 'AdminRow',
                          fullName: 'se.uniply.dfkka.db.TableDefinitions.AdminRow',
                          typehint: 'BasicTypeInfo',
                          typeArgs: [],
                          members: [],
                          declAs: {
                            typehint: 'Class'
                          }
                        }
                      ],
                      members: [],
                      declAs: {
                        typehint: 'Class'
                      }
                    },
                    {
                      name: 'Option[ParticipantCardRow]',
                      fullName: 'scala.Option[se.uniply.dfkka.db.TableDefinitions.ParticipantCardRow]',
                      typehint: 'BasicTypeInfo',
                      typeArgs: [
                        {
                          name: 'ParticipantCardRow',
                          fullName: 'se.uniply.dfkka.db.TableDefinitions.ParticipantCardRow',
                          typehint: 'BasicTypeInfo',
                          typeArgs: [],
                          members: [],
                          declAs: {
                            typehint: 'Class'
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
                    typehint: 'Class'
                  }
                },
                {
                  name: 'Seq',
                  fullName: 'scala.collection.Seq',
                  typehint: 'BasicTypeInfo',
                  typeArgs: [],
                  members: [],
                  declAs: {
                    typehint: 'Trait'
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
            typehint: 'Class'
          }
        },
        {
          name: 'Seq',
          fullName: 'scala.collection.Seq',
          typehint: 'BasicTypeInfo',
          typeArgs: [],
          members: [],
          declAs: {
            typehint: 'Trait'
          }
        }
      ],
      members: [],
      declAs: {
        typehint: 'Class'
      }
    }
    const result = formatType(type)
    expect(result).toBe(type.name)
  })
})
