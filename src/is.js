import {allPass, anyPass, complement, compose, defaultTo, either, has, is, isNil, not, path, toString} from 'ramda'
import Selector from './Selector'

const coerceToString = val => (is(String, val) ? val : toString(val))

export const isDuxSelector = selector => (selector instanceof Selector)
export const isNotNil = complement(isNil)
export const isNotBlankString = s => not(/^\s*$/.test(s))
export const isStringieThingie = allPass([
    isNotBlankString,
    either(is(Number), is(String)),
    isNotNil
])
export const isPrimitive = anyPass([
    is(Boolean),
    is(Number),
    is(String),
    is(Date)
])
export const isTransitionPossible = (transitionName, currentState, machine) =>
    compose(
        has(coerceToString(transitionName)),
        defaultTo({}),
        path([coerceToString(currentState)])
    )(machine)
