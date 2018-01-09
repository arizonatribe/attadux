import {
    __,
    allPass,
    always,
    any,
    anyPass,
    applyTo,
    compose,
    complement,
    concat,
    cond,
    converge,
    curry,
    defaultTo,
    either,
    filter,
    has,
    head,
    identity,
    ifElse,
    is,
    isEmpty,
    isNil,
    keys,
    map,
    mapAccum,
    mergeAll,
    mergeDeepRight,
    mergeDeepWith,
    none,
    nth,
    objOf,
    of,
    prop,
    reduce,
    split,
    T,
    type as getType,
    uniq,
    values
} from 'ramda'

// import log from '../../test/util'
import {isDux, isPlainObj, isNotBlankString, isPrimitiveish} from './is'

import {coerceToFn, coerceToArray} from './coerce'

import {duxDefaults} from '../schema/rules'

import {concatOrReplace} from '../types'

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
        if (is(Array, parent) && !isNil(child)) {
            return [...parent, ...coerceToArray(child)]
        }
        if (!isPlainObj(parent)) {
            return parent
        }
    } else if (isPrimitiveish(child) || is(Function, child)) {
        return child
    } else if (is(Array, parent)) {
        return [...parent, ...coerceToArray(child)]
    }

    return mergeDeepRight(parent, child)
}

/**
 * A function that creates an "extender" function which will merges
 * a portion of two duck together at a specified prop
 *
 * @func
 * @sig {k: v} -> {k: v} -> String -> *
 * @param {Object} childDuckOptions A set of options from which a duck can be built
 * @param {Object} parentDuck A duck that has already been built
 * @param {String} key A key name from which to match child options to parent (same prop for both)
 * @returns {Function} A function that takes the name of a prop on a duck, and
 * will merge the parent and child together for that prop
 */
export const createOptionsExtender = curry(
    (childDuckOptions, parentDuck, key) =>
        cond([
            /* If the key at the child or parent is a function */
            [compose(any(compose(is(Function), prop(key)))), always(
                /* then they both need to be invoked (coerced to fn, if not) and their results merged */
                converge(mergeDeepWith(simpleMergeStrategy), [
                    coerceToFn(parentDuck[key]),
                    converge(coerceToFn(childDuckOptions[key]), [
                        identity,
                        coerceToFn(parentDuck[key])
                    ])
                ])
            )],
            /* If the child doesn't have anything at that key, just return from the parent */
            [compose(isNil, prop(key)), always(parentDuck[key])],
            /* Otherwise, simply merge the parent and child together at that key */
            [T, compose(mergeDeepWith(simpleMergeStrategy, parentDuck[key]), prop(key))]
        ])(childDuckOptions)
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

/**
 * Takes an already built duck and the options for building a new one and
 * extends the new options onto the options and simple props of the already
 * built duck.
 * The combined object can be passed as options when creating a new duck.
 *
 * @func
 * @sig {k: v} -> {k: v} -> {k: v}
 * @param {Object} duck An existing duck from which a new duck will be based
 * @param {Object} options A set of options to be merged with those of an
 * existing duck (to be used together whenn creating a new duck)
 * @returns {Object} a merged set of options to be fed into a new duck
 */
export const extendDuckOptions = duck => {
    const {options: parentOptions} = duck
    const extendOptions = compose(
        reduce(mergeDeepRight, {}),
        concat([duxDefaults, parentOptions]),
        of,
        applyTo(duck),
        coerceToFn
    )

    return options => {
        const childOptions = extendOptions(options)
        const optionBuilders = [
            ['consts', always(mergeDeepWith(concatOrReplace, parentOptions.consts, childOptions.consts))],
            ['types', compose(uniq, concat(parentOptions.types), concat(childOptions.types), keys, prop('types'))],
            ['initialState', createOptionsExtender(childOptions)],
            ['machines', createOptionsExtender(childOptions)],
            ['creators', createOptionsExtender(childOptions)],
            ['selectors', createOptionsExtender(childOptions)],
            ['validators', createOptionsExtender(extendOptions(parentOptions))]
        ]
        const buildOptions = compose(
            mergeDeepRight(childOptions),
            mergeAll,
            map(head),
            mapAccum(
                (mergedDuck, [key, builder]) => {
                    const option = compose(
                        objOf(key),
                        ifElse(is(Function), applyTo(key), identity),
                        builder
                    )(mergedDuck)
                    return [mergeDeepRight(mergedDuck, option), option]
                },
                duck
            )
        )
        return compose(mergeDeepRight(childOptions), buildOptions)(optionBuilders)
    }
}
