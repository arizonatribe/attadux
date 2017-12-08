import {all, anyPass, both, either, evolve, has, keys, identity, is, pick} from 'ramda'
import spected from 'spected'
import {isPrimitiveish, isPlainObj, isNotBlankString} from './is'
import {
    anyValidationFailures,
    createConstants,
    createTypes,
    pruneInvalidFields,
    pruneValidatedFields
} from './helpers'

export const duxDefaults = {
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

export const duxSchema = {
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
    store: [[is(String), 'must be a string'], [isNotBlankString, 'Cannot be blank']],
    namespace: [[is(String), 'must be a string'], [isNotBlankString, 'Cannot be blank']],
    stateMachinesPropName: [[is(String), 'must be a string'], [isNotBlankString, 'Cannot be blank']],
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

export const createDuckSchemaValidator = (options) => {
    const optionsToValidate = pick(keys(duxSchema), options)
    const validationsResult = spected(duxSchema, optionsToValidate)
    const validatedOptions = pruneInvalidFields(optionsToValidate, validationsResult)
    return {validationsResult, validatedOptions}
}

export const validateAndSetValues = (values = {}) => {
    const {validationsResult, validatedOptions} = createDuckSchemaValidator(values)
    const evolvers = {
        namespace: identity,
        store: identity,
        strictTransitions: identity,
        useTransitions: identity,
        cancelReducerOnValidationError: identity,
        stateMachinesPropName: identity,
        consts: createConstants,
        types: createTypes(validatedOptions)
    }
    return {
        ...evolve(evolvers, pick(keys(evolvers), validatedOptions)),
        ...(anyValidationFailures(validationsResult) ? {
            invalidOptions: pruneValidatedFields(validationsResult)
        } : {}),
        options: validatedOptions
    }
}

export function setProp(prop, setter) {
    if (has(prop, this.options)) {
        this[prop] = setter.call(this)
    }
}
