import {
  all,
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
 * Most of the time, this is what you're looking for when checking a String value:
 *   - Is it a String?
 *   - Is it something other than whitespace?
 *
 * @func
 * @sig * -> Boolean
 * @param {*} val A value that may or may not be a non-blank String
 * @returns {Boolean} Whether or not the value is a non-blank String
 */
export const isGoodString = both(is(String), isNotBlankString)

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

/**
 * Checks to see if a given value a Function or an Object
 * (meant to be transformed into a [Shapey](https://github.com/arizonatribe/shapey) spec Function
 *
 * @func
 * @sig * -> Boolean
 * @param {*} val A value to evaluate as a possible pair of predicate (String/RegExp/Function) & transform/effect Function
 * @returns {Boolean} whether or not the value is an enhancer
 */
export const isSpecOrFunction = anyPass([
  both(is(Array), all(either(is(Function), isPlainObj))),
  isPlainObj,
  is(Function)
])

/**
 * Checks to see if a given value is an Enhancer, which means it is an Array
 * that has one of the following as its first index:
 *   - A Regular Expression
 *   - A String value (not blank; should match some Action's type value)
 *   - A predicate function (meant to evaluate a criteria on an Action object)
 *
 * For the second index, it checks to see if it is:
 *   - An Object (meant to be transformed into a [Shapey](https://github.com/arizonatribe/shapey) spec Function
 *   - A Function meant to return an Action Object
 *
 * @func
 * @sig * -> Boolean
 * @param {*} val A value to evaluate as a possible pair of predicate (String/RegExp/Function) & transform/effect Function
 * @param {Object} obj An object on which a given prop may exist
 * @returns {Boolean} whether or not the value is a qualifying pre-formed Enhancer
 */
export const isEnhancer = allPass([
  is(Array),
  pathSatisfies(anyPass([is(RegExp), isGoodString, is(Function)]), [0]),
  pathSatisfies(either(is(Function), isPlainObj), [1])
])

/**
 * Checks to see if a given value is an Array that is meant to be turned into an Effect handler,
 * which means the first index should be:
 *   - A Regular Expression
 *   - A String value (not blank; should match some Action's type value)
 *   - A predicate function (meant to evaluate a criteria on an Action object)
 *
 * For the second index, it checks to see if it is:
 *   - An Object (meant to be transformed into a [Shapey](https://github.com/arizonatribe/shapey) spec Function
 *   - A Function meant to produce some kind of effect
 *
 * For the (optional) third index, it checks to see if it is:
 *   - An Object (meant to be transformed into a [Shapey](https://github.com/arizonatribe/shapey) spec Function
 *   - A Function meant to return an Action Object when the effect succeeds
 *   - A String, meant to become the "type" prop on a new Action Object that is
 *     returned when the effect succeeds
 *
 * For the (optional) fourth index, it checks to see if it is:
 *   - An Object (meant to be transformed into a [Shapey](https://github.com/arizonatribe/shapey) spec Function
 *   - A Function meant to return an Action Object when the effect fails
 *   - A String, meant to become the "type" prop on a new Action Object that is
 *     returned when the effect fails
 *
 * @func
 * @sig * -> Boolean
 * @param {*} val A value to evaluate as a possible pair of predicate (String/RegExp/Function) & transform/effect Function
 * @param {Object} obj An object on which a given prop may exist
 * @returns {Boolean} whether or not the value is a qualifying predicate pair
 */
export const isEffect = allPass([
  is(Array),
  pathSatisfies(anyPass([is(RegExp), isGoodString, is(Function)]), [0]),
  pathSatisfies(either(is(Function), isPlainObj), [1]),
  pathSatisfies(anyPass([isNil, isPlainObj, isGoodString, is(Function)]), [2]),
  pathSatisfies(anyPass([isNil, isPlainObj, isGoodString, is(Function)]), [3])
])
