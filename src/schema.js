import {
    all,
    allPass,
    anyPass,
    both,
    compose,
    difference,
    either,
    equals,
    evolve,
    filter,
    flatten,
    has,
    keys,
    identity,
    is,
    isEmpty,
    last,
    length,
    map,
    not,
    pick,
    prop,
    split,
    toPairs,
    uniq,
    values
} from 'ramda'
import spected from 'spected'
import {isNotEmpty, isDux, isPrimitiveish, isPlainObj, isStringieThingie} from './is'
import {
    anyValidationFailures,
    createConstants,
    createTypes,
    getStateMachinesPropPath,
    pruneInvalidFields,
    pruneValidatedFields
} from './helpers'

export const duxDefaults = {
    cancelReducerOnValidationError: false,
    strictTransitions: false,
    useTransitions: true,
    stateMachinesPropName: 'states',
    consts: {},
    creators: {},
    machines: {},
    selectors: {},
    types: [],
    validators: {}
}

export const duxRules = {
    /*
     * Determines whether the reducer is canceled when a given action
     * is not listed among the accepted inputs for the current state
     * This does not mean you only accept actions which change state,
     * but rather you that you whitelist (or register) every action
     * and set their value to remain in the current state.
     */
    strictTransitions: [[is(Boolean), 'must be a bool']],
    useTransitions: [[is(Boolean), 'must be a bool']],
    cancelReducerOnValidationError: [[is(Boolean), 'must be a bool']],
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

const getStateInputs = compose(
    uniq,
    filter(isStringieThingie),
    flatten,
    map(keys),
    values
)
const getTransitions = compose(
    uniq,
    filter(isStringieThingie),
    flatten,
    map(values),
    values
)
const isEachTransitionAmongMachineStates = machine =>
    isEmpty(difference(getTransitions(machine), keys(machine)))
const areStatesValidShape = compose(
    all(allPass([isPlainObj, isNotEmpty, compose(isNotEmpty, values)])),
    values
)
const isValidStateMachineShape = compose(
    all(allPass([isPlainObj, isNotEmpty, areStatesValidShape, isEachTransitionAmongMachineStates])),
    values
)
const areStateMachineInputsActionTypes = all(
    compose(
        isEmpty,
        difference(
            compose(keys, prop('types')),
            compose(map(getStateInputs), prop('machines'))
        )
    )
)
const duckMiddlewareRules = {
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
    machines: [[isValidStateMachineShape, 'must be an object of state machines']],
    stateMachinesPropName: [[
        both(is(Array), all(isStringieThingie)),
        'must be an array of strings (representing the path to the "current state" prop)'
    ]]
}
const areValidDucksForMiddleware = compose(
    not,
    anyValidationFailures,
    spected(duckMiddlewareRules)
)
const areValidStateMachines = compose(
    all(both(areStateMachineInputsActionTypes, areValidDucksForMiddleware)),
    values,
    filter(isDux)
)
const duckNamesMatchStoreNames = compose(
    all(([key, val]) => equals(key, prop('store', val))),
    toPairs,
    filter(isDux)
)

export const validateMiddlwareDucks = compose(
    allPass([
        isPlainObj,
        isNotEmpty,
        duckNamesMatchStoreNames,
        areValidStateMachines
    ])
)

export const createDuckSchemaValidator = (options) => {
    const optionsToValidate = pick(keys(duxRules), options)
    const validationsResult = spected(duxRules, optionsToValidate)
    const validatedOptions = pruneInvalidFields(optionsToValidate, validationsResult)
    return {validationsResult, validatedOptions}
}

export const validateAndSetValues = (inputValues = {}) => {
    const {validationsResult, validatedOptions} = createDuckSchemaValidator(inputValues)
    const evolvers = {
        namespace: identity,
        store: identity,
        strictTransitions: identity,
        useTransitions: identity,
        cancelReducerOnValidationError: identity,
        stateMachinesPropName: getStateMachinesPropPath,
        consts: createConstants,
        types: createTypes(validatedOptions)
    }
    return {
        stateMachinesPropName: ['states'],
        ...evolve(evolvers, pick(keys(evolvers), validatedOptions)),
        ...(anyValidationFailures(validationsResult) ? {
            invalidOptions: pruneValidatedFields(validationsResult)
        } : {}),
        options: validatedOptions
    }
}

export function setProp(p, setter) {
    if (has(p, this.options)) {
        this[p] = setter.call(this)
    }
}
