import {
    allPass,
    anyPass,
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
 * Checks to see if a given value is a Duck instance
 *
 * @func
 * @sig * -> Boolean
 * @param {*} val A value which may or may not be a Duck instance
 * @returns {Boolean} whether or not the object is an instance of a Duck
 */
export const isDux = compose(
    equals('Duck'),
    path(['constructor', 'name']),
    defaultTo({})
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
 * Checks to see if a provided object has a given prop (path)
 *
 * @func
 * @sig [String] -> {k: v} -> Boolean
 * @param {String[]} propPath An array of string values representing the nested path to a prop
 * @param {Object} obj An object on which a given prop may exist
 * @returns {Boolean} whether or not the provided prop path exists on the provided object
 */
export const hasNestedProp = curry((propPath, obj) => compose(isNotNil, path(propPath))(obj))
