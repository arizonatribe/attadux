import {
    allPass,
    anyPass,
    complement,
    compose,
    curry,
    defaultTo,
    either,
    has,
    is,
    isNil,
    not,
    path,
    toString
} from 'ramda'

export const coerceToString = val => (is(String, val) ? val : toString(val))
export const needsExtraction = selector => (selector.needsExtraction === true)
export const isValidPropName = s => /^(?:[A-Z])([A-Z0-9_\-.]+)([A-Z0-9])$/i.test(s)
export const isPlainObj = (val = '') => ((val).constructor.name === 'Object')
export const isNotNil = complement(isNil)
export const hasNestedProp = (propPath, obj) => compose(isNotNil, path(propPath))(obj)
export const isNotBlankString = s => not(/^\s*$/.test(s))
export const isStringieThingie = allPass([
    isNotBlankString,
    either(is(Number), is(String)),
    isNotNil
])
export const isPrimitiveish = anyPass([
    is(Boolean),
    is(Number),
    is(String),
    is(RegExp),
    is(Date)
])
export const isTransitionPossible = curry((transitionName, currentState, machine) =>
    compose(
        has(coerceToString(transitionName)),
        defaultTo({}),
        path([coerceToString(currentState)]),
        defaultTo({})
    )(machine)
)
