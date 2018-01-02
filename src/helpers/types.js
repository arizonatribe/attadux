import {
    allPass,
    always,
    compose,
    filter,
    ifElse,
    is,
    map,
    not,
    prop,
    reduce,
    toPairs,
    values,
    zipObj
} from 'ramda'

import {isNotNil, isPrimitiveish} from './is'

import {listOfPairsToOneObject, coerceToArray} from './coerce'

/**
 * Retrieves all a duck's namespaced types
 *
 * @func
 * @sig {k: v} -> [String]
 * @param {Object} duck An object containing an object of action types, whose values are namespaced
 * @returns {String[]} A list of all the namespaced types for a given duck
 */
export const getTypes = compose(values, prop('types'))

/**
 * Merges together either two lists or appends a non-list type into another list
 *
 * @func
 * @sig ([a], b) -> [a, b]
 * @param {Array} left A list of any type of values
 * @param {Array|*} right Either a list of values or any kind of non-list value
 * to append to the 'left' list
 * @returns {Array|*} a merged list (if 'left' was an array, otherwise 'right')
 */
export const concatOrReplace = (left, right) => (
    is(Array, left) ?
    [...left, ...coerceToArray(right)] :
    right
)

/**
 * A function which validates and then deep freezes an object of constants
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} constants An Object which should contain only primitive values or arrays of primitives values
 * @returns {Object} A frozen Object with only the values which have been validated
 */
export const createConstants = ifElse(
    /* no nested functions or objects, just primitives or conversion of arrays
     * of primitives into simple objects whose keys and vals are the same */
    allPass([
        compose(not, isPrimitiveish),
        compose(not, is(Array)),
        is(Object)
    ]),
    compose(
        Object.freeze,
        reduce(listOfPairsToOneObject, {}),
        filter(isNotNil),
        map(([name, value]) => {
            if (is(Array, value)) {
                /* Creates an object whose keys and values are identical */
                return [
                    name,
                    Object.freeze(
                        zipObj(value.filter(isPrimitiveish), value.filter(isPrimitiveish))
                    )
                ]
            }
            return isPrimitiveish(value) ? [name, value] : null
        }),
        toPairs
    ),
    always({})
)

/**
 * A function which takes an Object containing namespace and store values and returns
 * a function that will formats an array of strings to have the namespace and
 * store as prefixes.
 *
 * @func
 * @sig {k: v} -> ([String] -> {k: v})
 * @param {Object} p An Object with both a 'namespace' and 'store' string value,
 * from which to format each action type
 * @returns {Function} A function which takes an array of Strings (action types)
 * and creates an Object formatted such that the each key and value matches the string,
 * but formatted as 'namespace/store/type'
 */
export const createTypes = ({namespace, store} = {}) =>
    (types = []) => zipObj(
        types,
        types.map(type => `${namespace || ''}/${store || ''}/${type}`)
    )
