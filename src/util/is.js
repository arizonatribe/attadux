import {
    allPass,
    anyPass,
    both,
    complement,
    compose,
    curry,
    defaultTo,
    either,
    equals,
    is,
    isEmpty,
    isNil,
    not,
    path,
    pathSatisfies,
    test
} from 'ramda'

/**
 * Checks to see if a prop name is an alphanumeric string (plus some symbols
 * allowed, like underscores, dashes and dots)
 *
 * @func
 * @sig a -> Boolean
 * @param {String} prop A prop name to check for formatting
 * @returns {Boolean} whether or not the prop name passed validation
 */
export const isValidPropName = test(/^(?:[A-Z])([A-Z0-9_\-.]+)([A-Z0-9])$/i)

/**
 * Checks to see if a given value is a JavaScript Promise
 *
 * @func
 * @sig * -> Boolean
 * @param {*} val A value to check to see if is a Promise
 * @returns {Boolean} whether or not the val is a Promise
 */
export const isPromise = compose(
    equals('Promise'),
    path(['constructor', 'name']),
    defaultTo('')
)

/**
 * Checks to see if a given value is an Object
 *
 * @func
 * @sig * -> Boolean
 * @param {*} val A value to check for objectishness
 * @returns {Boolean} whether or not the val is a plain old JS object
 */
export const isPlainObj = compose(
    equals('Object'),
    path(['constructor', 'name']),
    defaultTo('')
)

/**
 * Checks to make sure a given value isn't null or undefined
 *
 * @func
 * @sig * -> Boolean
 * @param {*} val A value which may or may not be null / undefined
 * @returns {Boolean} whether or not the value was non-nil
 */
export const isNotNil = complement(isNil)

/**
 * Checks to make sure a given value isn't empty
 *
 * @func
 * @sig * -> Boolean
 * @param {*} val A value which may or may not be empty
 * @returns {Boolean} whether or not the value was non-empty
 */
export const isNotEmpty = complement(isEmpty)

/**
 * Checks to see whether or not a given String is non-blank (one or more chars)
 *
 * @func
 * @sig String -> Boolean
 * @param {String} val A String which may or may not be blank
 * @returns {Boolean} whether or not a given String is non-blank
 */
export const isNotBlankString = compose(not, test(/^\s*$/))

/**
 * Checks to see whether or not a given value is a non-blank String (one or more chars)
 *
 * @func
 * @sig * -> Boolean
 * @param {*} val A value which may or may not be a non-blank String
 * @returns {Boolean} whether or not a given value is a non-blank String
 */
export const isStringieThingie = allPass([
    isNotBlankString,
    either(is(Number), is(String)),
    isNotNil
])

/**
 * Checks to see whether or not a given value is either: Boolean, Number, String, Data, or RegExp
 *
 * @func
 * @sig * -> Boolean
 * @param {*} val A value which may or may not be "primitive-ish"
 * @returns {Boolean} whether or not a given value is "primitive-ish"
 */
export const isPrimitiveish = anyPass([is(Boolean), is(Number), is(String), is(RegExp), is(Date)])

/**
 * Check that action is an object with a "type" prop that is a non-blank string
 * 
 * @func
 * @sig * -> Boolean
 * @param {*} val A value which may or may not be a Redux action
 * @returns {Boolean}
 */
export const isAction = both(isPlainObj, pathSatisfies(allPass([is(String), test(/\S/)]), ['type']))

/**
 * Checks to see if a provided object has a given prop (path)
 *
 * @func
 * @sig [String] -> {k: v} -> Boolean
 * @param {String[]} propPath An array of string values representing the nested path to a prop
 * @param {Object} obj An object on which a given prop may exist
 * @returns {Boolean} whether or not the provided prop path exists on the provided object
 */
export const hasNestedProp = curry((propPath, obj) => compose(isNotNil, path(propPath))(obj))
