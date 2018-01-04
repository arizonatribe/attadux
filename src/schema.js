import formatUtil from 'format-util'
import {
    all,
    allPass,
    anyPass,
    both,
    compose,
    curry,
    either,
    equals,
    evolve,
    filter,
    has,
    keys,
    identity,
    is,
    last,
    length,
    map,
    pick,
    pickBy,
    prop,
    split,
    toPairs,
    uniq,
    values
} from 'ramda'
import spected from 'spected'

import {
    areStateNamesStrings,
    areInputsAndTransitionsStrings,
    getStateMachinesPropPath,
    invalidStateMachineInputs,
    isEachTransitionAmongMachineStates
} from './helpers/machines'
import {createConstants, createTypes} from './helpers/types'
import {noDucks} from './helpers/duck'
import {isNotEmpty, isDux, isPrimitiveish, isPlainObj, isStringieThingie} from './helpers/is'
import {isValidationLevel, pruneInvalidFields, pruneValidatedFields, makeValidationLevel} from './helpers/validations'

export const duxDefaults = {
    consts: {},
    creators: {},
    machines: {},
    selectors: {},
    stateMachinesPropName: 'states',
    types: [],
    validationLevel: 'CANCEL',
    validators: {}
}

export const duxRules = {
    validationLevel: [[isValidationLevel, 'must be: STRICT, CANCEL, PRUNE, or LOG. CANCEL is the default.']],
    store: [[isStringieThingie, 'must be a (non-blank) string']],
    namespace: [[isStringieThingie, 'must be a (non-blank) string']],
    stateMachinesPropName: [[
        either(isStringieThingie, both(is(Array), all(isStringieThingie))),
        'must be a string (or array of strings)'
    ]],
    consts: [[either(isPlainObj, is(Function)), 'must be an object (or a function returning an object)']],
    creators: [[either(isPlainObj, is(Function)), 'must be an object (or a function returning an object)']],
    machines: [[either(isPlainObj, is(Function)), 'must be an object (or a function returning an object)']],
    selectors: [[either(isPlainObj, is(Function)), 'must be an object (or a function returning an object)']],
    types: [[both(is(Array), all(is(String))), 'must be an object (or a function returning an object)']],
    validators: [[either(isPlainObj, is(Function)), 'must be an object (or a function returning an object)']],
    reducer: [[is(Function), 'must be a function']],
    initialState: [[
        anyPass([isPrimitiveish, isPlainObj, is(Function)]),
        'must be an object, a function returning an object, or a primitive value'
    ]]
}

export const duckMiddlewareRules = {
    constructor: {
        name: [[equals('Duck'), 'must be a Duck instance']]
    },
    store: [[isStringieThingie, 'must be a (non-blank) string']],
    namespace: [[isStringieThingie, 'must be a (non-blank) string']],
    types: [
        [isPlainObj, 'must be an object'],
        [compose(
            all(compose(equals(1), length, uniq)),
            map(([key, val]) => ([key, compose(last, split('/'))(val)])),
            filter(all(is(String))),
            toPairs
        ), 'each key and value are identical']
    ],
    machines: [
        [compose(all(isPlainObj), values), 'must be an object'],
        [compose(all(isNotEmpty), values), 'must not be empty'],
        [compose(all(allPass([areStateNamesStrings, areInputsAndTransitionsStrings])), values),
            'each machine contains nested objects (states) whose inputs and transitions are strings'
        ],
        [compose(all(isEachTransitionAmongMachineStates), values), 'each transition value must also be a state']
    ],
    stateMachinesPropName: [[
        both(is(Array), all(isStringieThingie)),
        'must be an array of strings (representing the path to the "current state" prop)'
    ]]
}

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

/**
 * Validates and applies the configuration options for a new Duck, also
 * performing final formatting for many of the duck's simpler props
 * (consts, types, validationLevel, namespace, store, etc.).
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} options All the configuration options to be passed into the duck constructor
 * @returns {Object} An object containing all the validated configuration options for the new Duck
 */
export const validateAndSetValues = (options) => {
    const {validationsResult, validatedOptions} = createDuckSchemaValidator(options)
    const evolvers = {
        namespace: identity,
        store: identity,
        validationLevel: makeValidationLevel,
        stateMachinesPropName: getStateMachinesPropPath,
        consts: createConstants,
        types: createTypes(validatedOptions)
    }
    return {
        stateMachinesPropName: ['states'],
        ...evolve(evolvers, pick(keys(evolvers), validatedOptions)),
        ...(pickBy(isNotEmpty, {invalidOptions: pruneValidatedFields(validationsResult)})),
        options: validatedOptions
    }
}

export function setProp(p, setter) {
    if (has(p, this.options)) {
        this[p] = setter.call(this)
    }
}
