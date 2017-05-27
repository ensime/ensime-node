/**
 * Server json protocol definitions
 */

export interface Typehinted {
    typehint: string
}

export interface Event extends Typehinted {}

/** Generic background notification. */
export interface SendBackgroundMessage extends Event {
  detail: string,
  code: number,
}

/** The presentation compiler is ready to accept requests. */
export interface AnalyzerReady extends Event { }

/** The presentation compiler has finished analysing the entire project. */
export interface FullTypeCheckComplete extends Event { }

/** The search engine has finished indexing the classpath. */
export interface IndexerReady extends Event { }

/** The presentation compiler was restarted. Existing `:type-id`s are invalid. */
export interface CompilerRestarted extends Event { }

/** The presentation compiler has invalidated all existing notes.  */
export interface ClearAllScalaNotes extends Event { }

/** The presentation compiler has invalidated all existing notes.  */
export interface ClearAllJavaNotes extends Event { }

export interface NoteSeverity extends Typehinted {
    typehint: 'NoteError' | 'NoteWarn' | 'NoteInfo'
}

export interface Note {
    file: string,
    msg: string,
    severity: NoteSeverity,
    beg: number,
    end: number,
    line: number,
    col: number,
}

/** The presentation compiler is providing notes: e.g. errors, warnings. */
export interface NewScalaNotes extends Event {
  isFull: boolean,
  notes: [Note]
}

/** The presentation compiler is providing notes: e.g. errors, warnings. */
export interface NewJavaNotes extends Event {
  isFull: boolean,
  notes: [Note]
}

export interface True extends Typehinted {}
export interface False extends Typehinted {}

export interface ConnectionInfo extends Typehinted {
    pid?: number
    implementation: [{name: string}]
    version: string
}

export interface ImplicitInfo extends Typehinted { }

export interface ImplicitParamInfo extends ImplicitInfo {
    start: number
    end: number
    fun: SymbolInfo // Not really
    params: [SymbolInfo]
    funIsImplicit: boolean
}

export interface ImplicitConversionInfo extends ImplicitInfo {
    start: number
    end: number
    fun: SymbolInfo
}

export interface ImplicitInfos extends Typehinted {
    infos: [ImplicitInfo]
}

export interface SymbolInfo extends Typehinted {
    name: string
    localName: string
    declPos?: SourcePosition
    type: TypeInfo
}

export interface CompletionsResponse extends Typehinted {
    completions: [Completion]
    prefix: string
}

export interface Completion extends Typehinted {
    isCallable: boolean
    name: string
    relevance: number
    typeInfo?: TypeInfo
    toInsert?: string
}

export interface DeclaredAs extends Typehinted {
    typehint: 'Method' | 'Trait' | 'Interface' | 'Object' | 'Class' | 'Field' | 'Nil'
}

export interface EntityInfo extends Typehinted {
    name: string
    members: [EntityInfo]
}

export interface Void extends Typehinted { }

export interface SourcePosition extends Typehinted { }
export interface EmptySourcePosition extends SourcePosition { }

export interface OffsetSourcePosition extends SourcePosition {
    file: string
    offset: number
    row?: number
    col?: number
}

export interface LineSourcePosition extends SourcePosition {
    file: string
    line: number
}

export interface TypeInfo extends EntityInfo {
    name: string
    declAs: DeclaredAs // "Nil" |
    fullName: string
    typeArgs: [TypeInfo]
    members: [EntityInfo]
    pos?: SourcePosition
    typeParams: [TypeInfo]
}

export interface BasicTypeInfo extends TypeInfo {

}

export interface ArrowTypeInfo extends TypeInfo  {
    resultType: TypeInfo
    paramSections: [ParamSectionInfo]
}

export interface ParamSectionInfo extends TypeInfo {
    isImplicit: boolean
    params: [[any]] // List of pairs of String, TypeInfo
}

export interface TypeSig {

}

export interface Type extends Typehinted {
    name: string
    fullName: string
    declAs: any
}

export interface RefactoringDesc {
    typehint: string
}

export interface Point {
    from: number
    to: number
}

export interface SymbolSearchResult extends Typehinted {
    name: string
    localName: string
    declAs: DeclaredAs
    pos?: SourcePosition
}

export interface TypeSearchResult extends SymbolSearchResult {}

export interface MethodSearchResult extends SymbolSearchResult {
  ownerName: string
}

export interface ImportSuggestions extends Typehinted {
    symLists: [[SymbolSearchResult]]
}

export interface DebugVmStatus extends Typehinted {
    status: string
}

export interface DebugVmSuccess extends DebugVmStatus { }

export interface DebugVmError extends DebugVmStatus {
    errorCode: number
    details: string
}

export interface Breakpoint extends Typehinted {
    file: string
    line: number
}

export interface BreakpointList extends Typehinted {
    active: [Breakpoint]
    pending: [Breakpoint]
}
