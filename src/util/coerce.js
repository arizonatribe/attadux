import {always, is, isNil, mergeDeepRight, type as getType, unless} from 'ramda'
import {isPlainObj, isPrimitiveish} from './is'

/**
 * Takes a prop of any type and depending will wrap it in an array -
 * unless the prop is an array, in which case it will be returned [as-is](http://ramdajs.com/docs/#identity)
 *
 * @func
 * @sig * -> [*]
 * @param {Array|*} p A prop of any type (arrays will be returned as-is)
 * @returns {Array} either the original prop (if it was an array) or an Array wrapping the original prop
 */
export const coerceToArray = unless(is(Array), Array)

/**
 * Takes a prop of any type and depending will [wrap a function around it](http://ramdajs.com/docs/#always) -
 * unless the prop is a function, in which case it will be returned [as-is](http://ramdajs.com/docs/#identity)
 *
 * @func
 * @sig * -> (() -> *)
 * @param {Function|*} p A prop of any type (functions will be returned as-is)
 * @returns {Function} either the original prop (if it was a Function) or a Function wrapping the original prop
 */
export const coerceToFn = unless(is(Function), always)

/**
 * Converts a value of any type to [its string equivalent](http://ramdajs.com/docs/#toString),
 * but passes through a String value [as-is](http://ramdajs.com/docs/#identity)
 *
 * @func
 * @sig * -> String
 * @param {*} s A value of any type (strings will be returned as-is)
 * @returns {String} either the original prop (if it was a String) or a stringified rendering of the original prop
 */
export const coerceToString = unless(is(String), toString)

/**
 * Simplest of common reducer functions that merges an array of key/value pairs into a single object
 *
 * @func
 * @sig ({k: v}, [k, v]) -> {k: v}
 * @param {Object} returnObj Accumulator object that each key/val pair will be
 * merged into
 * @param {Array} pairs A simple key/value pair array (just two indexes in the array)
 * @returns {Objedt} The merged object of key/value pairs
 */
export const listOfPairsToOneObject = (returnObj, [key, val]) => ({...returnObj, [key]: val})

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
