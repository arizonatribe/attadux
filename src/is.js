import {allPass, anyPass, complement, either, is, isNil, not} from 'ramda'
import Selector from './Selector'

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
