import spected from 'spected'
import formatUtil from 'format-util'
import {all, compose, curry, equals, filter, keys, map, pick, prop, toPairs, values} from 'ramda'

import {invalidStateMachineInputs} from '../machines'
import {isNotEmpty} from '../util/is'
import {duckMiddlewareRules, duxRules, isDux, noDucks} from './schema'
import {pruneInvalidFields, pruneValidatedFields} from '../validators'

/**
 * A curried wrapper around [format-util](https://www.npmjs.com/package/format-util)
 * that places the second param into the placeholder from the first param.
 *
 * @func
 * @sig String -> String -> String
 * @param {String} description A description of the error message
 * (friendly to standard message formatting charaacters: %s %o %f etc)
 * @param {String} message An value to plug into the description using formatting placeholders
 * @returns {String} A formatted message
 */
const format = curry((description, message) => formatUtil(description, message))

/**
 * Validates all the configuration options for a new Duck, returning any
 * validation errors and a filtered version of the config options (just those
 * that passed validation).
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} options All the configuration options to be passed into the duck constructor
 * @returns {Object} An object containing the 'validationsResult'
 * and 'validatedOptions' (which are just all the validated fields)
 */
export const createDuckSchemaValidator = (options = {}) => {
    const optionsToValidate = pick(keys(duxRules), options)
    const validationsResult = spected(duxRules, optionsToValidate)
    const validatedOptions = pruneInvalidFields(optionsToValidate, validationsResult)
    return {validationsResult, validatedOptions}
}

// export const createDuckSchemaValidator = compose(
//     converge(merge, [
//         compose(
//             objOf('validatedOptions'),
//             converge(pruneInvalidFields, [identity, spected(duxRules)])
//         ),
//         compose(objOf('validationsResult'), spected(duxRules))
//     ]),
//     pick(keys(duxRules))
// )

/**
 * For a row of ducks, retrieves any invalid inputs for each duck's state machines.
 * State machines are objects whose keys are states and whose values are objects
 * inside of which the input value is the key of each of its key/value pairs.
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} row An object of ducks, each containing one or more state machines and action types
 * @returns {Object} An object of validation error messages about invalid states inputs for each duck's state machines
 */
export const getInvalidStateMachineInputs = compose(
    map(format('These inputs are not valid Action Types: %o')),
    filter(isNotEmpty),
    map(invalidStateMachineInputs),
    values,
    filter(isDux)
)

/**
 * For a row of ducks, checks the schema rules for valiation errors.
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} row An object of ducks
 * @returns {Object} An object of validation error messages corresponding to one or more ducks in the row
 */
export const getInvalidDucks = compose(
    map(format('These violations of the schema rules for the middleware were found: %o')),
    filter(isNotEmpty),
    map(compose(pruneValidatedFields, spected(duckMiddlewareRules))),
    values,
    filter(isDux)
)

/**
 * For a row of ducks, checks if the name given to the duck inside the row maches that duck's store prop.
 *
 * @func
 * @sig {k: v} -> Boolean
 * @param {Object} row An object of ducks
 * @returns {Boolean} whether the name for each duck (in the row) matches each duck's store prop
 */
export const duckNamesMatchStoreNames = compose(
    all(([key, val]) => equals(key, prop('store', val))),
    toPairs,
    filter(isDux)
)

/**
 * Checks for any validation errors on a row of ducks.
 * If there are errors, a string description of the problem(s) is returned.
 *
 * @func
 * @sig {k: v} -> String
 * @param {Object} row An object containing one or more ducks
 * @returns {String|null} A validation error message or null (if no validation errors)
 */
export const getRowValidationErrors = row => {
    if (noDucks(row)) {
        // eslint-disable-next-line max-len
        return 'No ducks have been provided! To create the Attadux middleware please provide an Object containing one or more ducks'
    }

    if (!duckNamesMatchStoreNames(row)) {
        // eslint-disable-next-line max-len
        return 'The name of each duck should match its \'store\' prop, otherwise it will not be possible to find the correct duck for each dispatched action'
    }

    const invalidStateMachines = getInvalidStateMachineInputs(row)
    if (isNotEmpty(invalidStateMachines)) {
        return format('Invalid State Machines: %o', invalidStateMachines)
    }

    const invalidDucks = getInvalidDucks(row)
    if (isNotEmpty(invalidDucks)) {
        return format('Invalid Ducks: %o', invalidDucks)
    }

    return null
}
