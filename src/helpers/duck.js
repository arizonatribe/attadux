import {
    __,
    allPass,
    always,
    anyPass,
    compose,
    complement,
    curry,
    defaultTo,
    either,
    filter,
    has,
    head,
    ifElse,
    is,
    isEmpty,
    isNil,
    keys,
    mergeDeepWith,
    none,
    nth,
    prop,
    reduce,
    split,
    type as getType,
    values
} from 'ramda'

import {isDux, isPlainObj, isNotBlankString, isPrimitiveish} from './is'

import {coerceToFn, coerceToArray} from './coerce'

/**
 * Checks whether or not a given Object contains ducks
 *
 * @func
 * @sig {k: v} -> Boolean
 * @param {Object} row An Object which may contain ducks among its props
 * @returns {Boolean} whether or not there are any ducks inside of a given Object
 */
export const noDucks = anyPass([
    complement(isPlainObj),
    compose(isEmpty, keys),
    compose(none(isDux), values)
])

/**
 * Merges multiple ducks into one flattened Object (which is hilariously being called a row, snicker, snicker)
 *
 * @func
 * @sig ({k: v}...) -> {k: v}
 * @param {...Object} ducks One or more ducks to merge into one row
 * @returns {Object} A single object composed of many ducks
 */
export const createRow = (...ducks) =>
    compose(
        reduce((row, duck) => ({...row, [duck.store]: duck}), {}),
        filter(allPass([has('store'), has('namespace'), isDux]))
    )(ducks)

/**
 * A function which merges two Objects, with the latter merging over the former
 * upon finding any duplicate fields. Also will return one or the other in full
 * (un-merged) if one of the params is not an Object.
 *
 * @func
 * @sig ({k: v}, {k: v}) -> *
 * @param {Object} parent An Object whose props will have lower precedence when
 * merged with another Object
 * @param {Object} child An Object whose props will have higher precedence when
 * merged with another Object
 * @returns {*} the merged result of two values
 */
export const simpleMergeStrategy = (parent, child) => {
    if (getType(parent) !== getType(child) || isNil(child)) {
        if (is(Array, parent) || !isNil(child)) {
            return [...parent, ...coerceToArray(child)]
        }
        return parent
    } else if (isPrimitiveish(child) || is(Function, child)) {
        return child
    } else if (is(Array, parent)) {
        return [...parent, ...coerceToArray(child)]
    }

    return {...parent, ...child}
}

/**
 * A function that creates an "extender" function which will merges
 * a portion of two duck together at a specified prop
 *
 * @func
 * @sig {k: v} -> {k: v} -> String -> {k: v}
 * @param {Object} parentDuck A duck that has already been built
 * @param {Object} childDuckOptions A set of options from which a duck can be built
 * @returns {Function} A function that takes the name of a prop on a duck, and
 * will merge the parent and child together at that location
 */
export const createExtender = curry(
    (parentDuck, childDuckOptions, key) => {
        if ([childDuckOptions, parentDuck].some(d => is(Function, d[key]))) {
            return {
                [key]: duck => {
                    const parent = coerceToFn(parentDuck[key])(duck)
                    return mergeDeepWith(
                        simpleMergeStrategy,
                        parent,
                        coerceToFn(childDuckOptions[key])(duck, parent)
                    )
                }
            }
        } else if (isNil(childDuckOptions[key])) {
            return isNil(parentDuck[key]) ? {} : {[key]: parentDuck[key]}
        }
        return {[key]: mergeDeepWith(simpleMergeStrategy, parentDuck[key], childDuckOptions[key])}
    }
)

/**
 * A function which takes an Object of one or more ducks and creates a function that will
 * extract whichever duck corresponds to a dispatched redux action
 *
 * @func
 * @sig {k: v} -> ({k: v} -> {k: v})
 * @param {Object} row An Object containing one or more ducks
 * @returns {Function} A function will takes a dispatched action
 * (whose type must be formatted as "namespace/store/type")
 * and returns the corresponding duck
 */
export const createDuckLookup = row =>
    compose(
        defaultTo({}),
        ifElse(
            isNotBlankString,
            prop(__, filter(isDux, row)),
            always({})
        ),
        either(nth(1), head),
        split('/'),
        prop('type')
    )
