import {
    all,
    allPass,
    anyPass,
    both,
    complement,
    compose,
    difference,
    either,
    equals,
    filter,
    identity,
    is,
    isEmpty,
    keys,
    last,
    length,
    map,
    none,
    split,
    toPairs,
    uniq,
    values
} from 'ramda'
import {
    areStateNamesStrings,
    areInputsAndTransitionsStrings,
    getStateMachinesPropPath,
    isEachTransitionAmongMachineStates
} from '../machines'
import {createConstants} from '../types'
import {isNotEmpty, isPrimitiveish, isPlainObj, isStringieThingie} from '../util/is'
import {isValidationLevel, makeValidationLevel} from '../validators'

/**
 * This object of functions is meant to be applied to an object which has
 * some or all of its keys sharing the same name as these evolver functions.
 *
 * Using [evolve()](http://ramdajs.docs/#evolve) on an object with this set of evolver functions
 * will create a clone of the original object with the result of each evolver in place of the original value.
 */
export const metadataEvolvers = {
    namespace: identity,
    store: identity,
    validationLevel: makeValidationLevel,
    stateMachinesPropName: getStateMachinesPropPath,
    consts: createConstants
}

/**
 * These are values which will always be set for a new duck,
 * even though the user may not explicitly supply a value for any of them.
 */
export const duxDefaults = {
    consts: {},
    creators: {},
    machines: {},
    queries: {},
    workers: {},
    selectors: {},
    stateMachinesPropName: 'states',
    types: [],
    validationLevel: 'CANCEL',
    validators: {}
}

/**
 * This set of rules is expected to be supplied to the (curried) [spected](https://github.com/25th-floor/spected)
 * function, and is then invoked against the set of values supplied when creating a new duck.
 *
 * The spected validator function will then apply this collection of validator functions against
 * any matching keys on the input values passed in, and set either a value of 'true' if validation succeeded
 * or an array of error messages for any value(s) that failed validation.
 */
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
    enhancers: [[either(isPlainObj, is(Function)), 'must be an object (or a function returning an object)']],
    multipliers: [[either(isPlainObj, is(Function)), 'must be an object (or a function returning an object)']],
    queries: [[either(isPlainObj, is(Function)), 'must be an object (or a function returning an object)']],
    workers: [[either(isPlainObj, is(Function)), 'must be an object (or a function returning an object)']],
    reducer: [[is(Function), 'must be a function']],
    initialState: [[
        anyPass([isPrimitiveish, isPlainObj, is(Function)]),
        'must be an object, a function returning an object, or a primitive value'
    ]]
}

/**
 * This set of rules is expected to be supplied to the (curried) [spected](https://github.com/25th-floor/spected)
 * function, and is then invoked against one or more ducks supplied to the validator middleware.
 *
 * The spected validator function will then apply this collection of validator functions against
 * any matching keys on the input values passed in, and set either a value of 'true' if validation succeeded
 * or an array of error messages for any value(s) that failed validation.
 *
 * The validator middleware makes use of a small portion of a given duck, so the schema rules
 * for validating a usable duck in the middleware function is less strict than those used to create a duck.
 */
export const duckMiddlewareRules = {
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
 * Checks to see if a given value is a Duck for middleware,
 * which means it is a namespaced unit that contains types and validators for one or more of those types.
 *
 * @func
 * @sig * -> Boolean
 * @param {*} val A value which may or may not be a Duck instance
 * @returns {Boolean} whether or not the object is an instance of a Duck
 */
export const isDux = compose(
    isEmpty,
    difference(['store', 'namespace', 'validators', 'types']),
    keys
)

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
