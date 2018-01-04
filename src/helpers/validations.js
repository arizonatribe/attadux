import {
    __,
    always,
    any,
    both,
    compose,
    contains,
    curry,
    defaultTo,
    either,
    identity,
    ifElse,
    is,
    isEmpty,
    keys,
    not,
    nth,
    prop,
    reduce,
    reject,
    T,
    toPairsIn,
    toUpper,
    trim,
    valuesIn
} from 'ramda'

import {isPlainObj} from './is'
import {createConstants} from './types'
import {coerceToString} from './coerce'

export const {VALIDATION_LEVELS} = createConstants({
    VALIDATION_LEVELS: ['STRICT', 'CANCEL', 'PRUNE', 'LOG']
})

/**
 * Checks to see if a given value is one of the valid options for
 * Validation Level, which are: STRICT, CANCEL, PRUNE, LOG
 *
 * @func
 * @sig String -> Boolean
 * @param {String} level One of the four valid options: STRICT, CANCEL, PRUNE, LOG
 * @returns {Boolean} Whether or not a level is valid for middleware validations
 */
export const isValidationLevel = contains(__, keys(VALIDATION_LEVELS))

/**
 * Sets a validation level, one of: STRICT, CANCEL, PRUNE, LOG.
 * The default - if no valid level is passed in - is CANCEL.
 *
 * @func
 * @sig String -> String
 * @param {String|*} level A validation level for the middleware
 * @returns {String} One of [STRICT, CANCEL, PRUNE, LOG]
 */
export const makeValidationLevel = compose(
    ifElse(isValidationLevel, identity, always('CANCEL')),
    toUpper,
    trim,
    coerceToString
)

/**
 * A curried function that examines the result of a [spected](https://github.com/25th-floor/spected) validator on a given
 * input object and replaces the validation failures with the original value
 * from the input object.
 *
 * @func
 * @sig {k: v} -> {k: v} -> {k: v}
 * @param {Object} original The input object which when pushed through a validator yielded the associated validations
 * @param {Object} validations An object of validation results (true for pass, String[] for fails)
 * @returns {Object} The validations result pruned of all invalid fields
 */
export const pruneInvalidFields = curry((original, validations) =>
    compose(
        reduce((prunedObj, [key, val]) => {
            const value = isPlainObj(val) ? pruneInvalidFields(original[key], val) : val
            if (isPlainObj(value) && isEmpty(value)) {
                return prunedObj
            }
            return {
                ...prunedObj,
                [key]: value === true ? original[key] : value
            }
        }, {}),
        reject(compose(is(Array), nth(1))),
        toPairsIn
    )(validations)
)

/**
 * A function that inspects a validations object (validated fields are Bools of `true` and
 * invalid fields are arrays of error messages) and removes everything but the errors
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} validations An object of validation results (true for pass, String[] for fails)
 * @returns {Object} The validations result pruned of all valid fields
 */
export const pruneValidatedFields = compose(
    reduce((prunedObj, [key, val]) => {
        const value = isPlainObj(val) ? pruneValidatedFields(val) : val
        if (isPlainObj(value) && isEmpty(value)) {
            return prunedObj
        }
        return {...prunedObj, [key]: value}
    }, {}),
    reject(pairs => pairs[1] === true),
    toPairsIn
)

/**
 * Simple retrieval function that looks for an action payload validator matching
 * a given action.
 *
 * @func
 * @sig {k: v} -> {k: v} -> ({k: v} -> Boolean)
 * @returns {Function} A validator matching a dispatched action (or a Function
 * always returning True if none exists)
 */
export const getValidatorForAction = validators => compose(
    defaultTo(T),
    prop(__, validators),
    prop('type')
)

/**
 * Creates a function that will receive a dispatched action and apply a validator function that
 * matches its action type (if one exists) and prune away any fields that failed validation.
 * The set of validator functions from which to match the action type is the only dependency.
 *
 * @func
 * @sig {k: v} -> {k: v} -> {k: v}
 * @param {Object} validators An object of curried [spected](https://github.com/25th-floor/spected) validator functions
 * @returns {Object} The original action paylod, minus any invalid fields
 */
export const createPayloadPruner = (validators = {}) =>
    (action = {}) =>
        compose(
            ifElse(isEmpty, always(null), identity),
            pruneInvalidFields(action),
            validate => validate(action),
            getValidatorForAction(validators)
        )(action)

/**
 * Creates a function that will receive a dispatched action and apply a validator function that
 * matches its action type (if one exists).
 * The set of validator functions from which to match the action type is the only dependency.
 *
 * @func
 * @sig {k: v} -> {k: v} -> {k: v}
 * @param {Object} validators An object of curried [spected](https://github.com/25th-floor/spected) validator functions
 * @returns {Object|null} An Object of validation errors, if any, otherwise returns null
 */
export const createPayloadValidationsLogger = (validators = {}) =>
    (action = {}) =>
        compose(
            ifElse(isEmpty, always(null), identity),
            pruneValidatedFields,
            validate => validate(action),
            getValidatorForAction(validators)
        )(action)

/**
 * Inspects an Object (can even be nested) of validation results, for props which failed validation.
 * Because the [spected](https://github.com/25th-floor/spected) tool follows a common validations format
 * where failed validations are Arrays of validation errors (strings) and validated props are simply marked `true`,
 * this function is only doing a quick, simple check for any props that are arrays.
 *
 * @func
 * @sig {k: v} -> Boolean
 * @param {Object} validations
 * @returns {Boolean}
 */
export const anyValidationFailures = (validations = {}) =>
    compose(
        any(either(both(isPlainObj, anyValidationFailures), is(Array))),
        valuesIn
    )(validations)

/**
 * Creates a function that will receive a dispatched action and apply a validator function that
 * matches its action type (if one exists) and do a basic pass/fail check.
 * The set of validator functions from which to match the action type is the only dependency.
 *
 * @func
 * @sig {k: v} -> {k: v} -> Boolean
 * @param {Object} validators An object of curried [spected](https://github.com/25th-floor/spected) validator functions
 * @returns {Function} A validator function to be applied against a dispatched action
 */
export const createPayloadValidator = (validators = {}) =>
    (action = {}) =>
        compose(
            not,
            anyValidationFailures,
            validate => validate(action),
            getValidatorForAction(validators)
        )(action)
