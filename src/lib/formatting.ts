import * as _ from 'lodash'

import * as api from './server-api/server-protocol'

const functionMatcher = new RegExp('scala\\.Function\\d{1,2}')
// const scalaPackageMatcher = new RegExp('scala\\.([\\s\\S]*)');
const refinementMatcher = new RegExp('(.*)\\$<refinement>') // scalaz.syntax.ApplyOps$<refinement>
const tupleMatcher = /^\(.*\)/

function fixQualifiedTypeName(theType: { fullName: string }): string {
    const refinementMatch = refinementMatcher.exec(theType.fullName)
    if (refinementMatch) {
        return refinementMatch[1]
    } else {
        return theType.fullName
    }
}

export function fixShortTypeName(theType: api.Type): string | undefined {
    const refinementMatch = refinementMatcher.exec(theType.fullName)
    if (refinementMatch) {
        return _.last(_.split(theType.fullName, '.'))
    } else {
        return typeConstructorFromName(theType.name)
    }
}

export function typeConstructorFromType(type: api.Type): string {
    return typeConstructorFromName(type.name)
}

export function typeConstructorFromName(name: string): string {
    return _.replace(name, /\[.*\]/, '')
}

export type TypeNameFormatter = (x: api.Type) => string

// # For hover
// # typeNameFormatter: function from {name, fullName} -> Html/String

function formatTypeWith(typeNameFormatter: TypeNameFormatter): (theType: any) => string | undefined {
    function recur(theType: any): string | undefined {
        const formatParam = (param: any) => {
            const type = recur(param[1])
            return `${param[0]}: ${type}`
        }

        const formatParamSection = (paramSection: any) => {
            const p = paramSection.params.map(formatParam)
            return p.join(', ')
        }

        const formatParamSections = (paramSections: any) => {
            const sections = paramSections.map(formatParamSection)
            return '(' + sections.join(')(') + ')'
        }

        const formatBasicType = (theType: any) => {
            const name = typeNameFormatter(theType)

            const typeArgs = theType.typeArgs
            if (!typeArgs || typeArgs.length === 0) {
                return name
            } else {
                const formattedTypeArgs = typeArgs.map(recur)
                if (theType.fullName === 'scala.<byname>') {
                    return '=> ' + formattedTypeArgs.join(', ')
                } else if (theType.fullName === 'scala.<repeated>') {
                    return formattedTypeArgs.join(', ') + '*'
                } else if (theType.fullName === 'scala.Function1') {
                    const i = formattedTypeArgs[0]
                    const o = formattedTypeArgs[1]
                    return i + ' => ' + o
                } else if (functionMatcher.test(theType.fullName)) {
                    const result = _.last(formattedTypeArgs)
                    const params = _.initial(formattedTypeArgs)
                    return `(${params.join(', ')}) => ${result}`
                } else if (tupleMatcher.test(theType.name)) {
                    return `(${formattedTypeArgs.join(', ')})`
                } else {
                    return name + `[${formattedTypeArgs.join(', ')}]`
                }
            }
        }

        if (theType.typehint === 'ArrowTypeInfo') {
            return formatParamSections(theType.paramSections) + ': ' + recur(theType.resultType)
        } else if (theType.typehint === 'BasicTypeInfo') {
            return formatBasicType(theType)
        }
    }
    return theType => recur(theType)
}

export function formatImplicitInfo(info: api.ImplicitInfo): string | undefined {
    if (info.typehint === 'ImplicitParamInfo') {
        const implicitParamInfo = info as api.ImplicitParamInfo
        return `Implicit parameters added to call of ${implicitParamInfo.fun.localName}: (${_.map(implicitParamInfo.params, p => p.localName).join(', ')})`
    } else if (info.typehint === 'ImplicitConversionInfo') {
        const implicitConversionInfo = info as api.ImplicitConversionInfo
        return `Implicit conversion: ${implicitConversionInfo.fun.localName}`
    }
}

export const formatType = formatTypeWith(typeConstructorFromType)
