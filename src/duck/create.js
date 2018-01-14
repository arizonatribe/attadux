import {
    __,
    always,
    ap,
    applySpec,
    applyTo,
    assoc,
    assocPath,
    call,
    compose,
    converge,
    defaultTo,
    either,
    evolve,
    filter,
    head,
    identity,
    ifElse,
    isEmpty,
    isNil,
    keys,
    map,
    mergeAll,
    mergeDeepRight,
    nth,
    objOf,
    of,
    path,
    pathSatisfies,
    pick,
    prop,
    propSatisfies,
    reduce,
    split,
    unapply
} from 'ramda'
import spected from 'spected'
import {createMachines, getDefaultStateForMachines} from '../machines'
import {createTransitionsPostReducer, createReducer} from '../reducers'
import {deriveSelectors} from '../selectors'
import {metadataEvolvers, isDux} from './schema'
import {createTypes} from '../types'
import {coerceToFn, isNotEmpty, isNotBlankString} from '../util'
import {createDuckSchemaValidator} from './validate'
import {
    createPayloadValidator,
    createPayloadValidationsLogger,
    createPayloadPruner,
    pruneValidatedFields
} from '../validators'


/**
 * Merges multiple ducks into one flattened Object (row).
 *
 * @func
 * @sig ({k: v}...) -> {k: v}
 * @param {...Object} ducks One or more ducks to merge into one row
 * @returns {Object} A single object composed of many ducks
 */
export const createRow = compose(
    reduce((row, duck) => assoc(duck.store, duck, row), {}),
    filter(isDux),
    unapply(identity)
)

/**
 * A function which takes an Object of one or more ducks and creates a function that will
 * extract whichever duck corresponds to a dispatched redux action
 *
 * @func
 * @sig {k: v} -> ({k: v} -> {k: v})
 * @param {Object} row An Object containing one or more ducks
 * @returns {Function} A function will takes a dispatched action
 * (whose type must be formatted as "namespace/store/type")
 * and returns the corresponding duck
 */
export const createDuckLookup = row =>
    compose(
        defaultTo({}),
        ifElse(
            isNotBlankString,
            prop(__, filter(isDux, row)),
            always({})
        ),
        either(nth(1), head),
        split('/'),
        prop('type')
    )

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
export const createDuckMetadata = compose(
    mergeAll,
    ap([
        compose(objOf('stateMachinesPropName'), always(['states'])),
        compose(
            converge(mergeDeepRight, [
                compose(evolve(metadataEvolvers), pick(keys(metadataEvolvers))),
                compose(objOf('types'), converge(createTypes, [identity, prop('types')]))
            ]),
            prop('validatedOptions')
        ),
        compose(
            ifElse(isNotEmpty, objOf('invalidOptions'), identity),
            pruneValidatedFields,
            prop('validationsResult')
        ),
        compose(objOf('options'), prop('validatedOptions'))
    ]),
    of,
    createDuckSchemaValidator
)

/**
 * Creates the Duck's validators (if they are present inside of its 'options' prop).
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} duck A duck which (may) contain validators (inside of its 'options')
 * @returns {Object} A clone of the duck, but now with validators (if they were found inside of 'options').
 */
export const createDuckValidators = converge(mergeDeepRight, [
    identity,
    ifElse(
        pathSatisfies(isNil, ['options', 'validators']),
        always({}),
        compose(
            objOf('validators'),
            map(spected),
            converge(call, [
                compose(coerceToFn, path(['options', 'validators'])),
                identity
            ])
        )
    )
])

/**
 * Creates the Duck's state machines (if they are present inside of its 'options' prop).
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} duck A duck which (may) contain state machines (inside of its 'options')
 * @returns {Object} A clone of the duck, but now with state machines (if they were found inside of 'options').
 */
export const createDuckMachines = converge(mergeDeepRight, [
    identity,
    ifElse(
        pathSatisfies(isNil, ['options', 'machines']),
        always({}),
        compose(
            objOf('machines'),
            converge(createMachines, [
                converge(call, [
                    compose(coerceToFn, path(['options', 'machines'])),
                    identity
                ]),
                identity
            ])
        )
    )
])

/**
 * Creates the Duck's initial state for the section of the store that affects this duck.
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} duck A duck which (may) contain initialState (inside of its 'options')
 * @returns {Object} A clone of the duck, but now with initialState (if it was found inside of 'options').
 */
export const createDuckInitialState = converge(mergeDeepRight, [
    identity,
    compose(
        objOf('initialState'),
        converge(mergeDeepRight, [
            converge(call, [
                compose(coerceToFn, path(['options', 'initialState'])),
                identity
            ]),
            ifElse(
                propSatisfies(isEmpty, 'machines'),
                always({}),
                compose(
                    applyTo({}),
                    converge(assocPath, [prop('stateMachinesPropName'), compose(
                        getDefaultStateForMachines,
                        prop('machines')
                    )])
                )
            )
        ])
    )
])

/**
 * Creates the Duck's selectors (if they are present inside of its 'options' prop).
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} duck A duck which (may) contain selectors (inside of its 'options')
 * @returns {Object} A clone of the duck, but now with selectors (if they were found inside of 'options').
 */
export const createDuckSelectors = converge(mergeDeepRight, [
    identity,
    ifElse(
        pathSatisfies(isNil, ['options', 'selectors']),
        always({}),
        compose(
            objOf('selectors'),
            deriveSelectors,
            converge(call, [
                compose(coerceToFn, path(['options', 'selectors'])),
                identity
            ])
        )
    )
])

/**
 * Creates the Duck's action creators (if they are present inside of its 'options' prop).
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} duck A duck which (may) contain action creators (inside of its 'options')
 * @returns {Object} A clone of the duck, but now with action creators (if they were found inside of 'options').
 */
export const createDuckActionCreators = converge(mergeDeepRight, [
    identity,
    ifElse(
        pathSatisfies(isNil, ['options', 'creators']),
        always({}),
        compose(
            objOf('creators'),
            converge(call, [
                compose(coerceToFn, path(['options', 'creators'])),
                identity
            ])
        )
    )
])

/**
 * Creates the Duck's reducer (if it was present inside of its 'options' prop).
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} duck A duck which (may) contain a reducer (inside of its 'options')
 * @returns {Object} A clone of the duck, but now with a reducer (if it was found inside of 'options').
 */
export const createDuckReducer = converge(mergeDeepRight, [
    identity,
    ifElse(
        either(
            pathSatisfies(isNil, ['options', 'reducer']),
            propSatisfies(isEmpty, 'machines')
        ),
        compose(objOf('reducer'), createReducer),
        compose(objOf('reducer'), createTransitionsPostReducer)
    )
])

/**
 * Creates validation helpers for a given Duck, to be used in the middleware chain.
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} duck A duck which (may) contain validators (inside of its 'options')
 * @returns {Object} A clone of the duck, but now with validator helpers (if validators were found inside of 'options').
 */
export const createValidationMiddlewareHelpers = converge(mergeDeepRight, [
    identity,
    ifElse(
        propSatisfies(isNil, 'validators'),
        always({}),
        compose(
            applySpec({
                isPayloadValid: createPayloadValidator,
                getValidationErrors: createPayloadValidationsLogger,
                pruneInvalidFields: createPayloadPruner
            }),
            prop('validators')
        )
    )
])