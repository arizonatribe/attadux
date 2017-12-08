import {allPass, anyPass, complement, compose, defaultTo, either, has, is, isNil, not, path, toString} from 'ramda'

export const coerceToString = val => (is(String, val) ? val : toString(val))
export const needsExtraction = selector => (selector.needsExtraction === true)
export const isPlainObj = (val = '') => ((val).constructor.name === 'Object')
export const isNotNil = complement(isNil)
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
export const isTransitionPossible = (transitionName, currentState, machine) =>
    compose(
        has(coerceToString(transitionName)),
        defaultTo({}),
        path([coerceToString(currentState)])
    )(machine)
