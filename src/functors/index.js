import spected from 'spected'
import {
    always,
    ap,
    applySpec,
    applyTo,
    assocPath,
    call,
    compose,
    converge,
    evolve,
    identity,
    ifElse,
    isEmpty,
    isNil,
    keys,
    map,
    mergeAll,
    mergeDeepRight,
    objOf,
    of,
    path,
    pathSatisfies,
    pick,
    prop,
    propSatisfies
} from 'ramda'
import {isNotEmpty, coerceToFn, extendDuckOptions} from '../helpers'
import {createMachines, getDefaultStateForMachines} from '../machines'
import {createTransitionsPostReducer, createReducer} from '../reducers'
import {createDuckSchemaValidator} from '../schema'
import {metadataEvolvers} from '../schema/rules'
import {deriveSelectors} from '../selectors'
import {createTypes} from '../types'
import {
    createPayloadValidator,
    createPayloadValidationsLogger,
    createPayloadPruner,
    pruneValidatedFields
} from '../validators'

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

export const createDuckValidators = converge(mergeDeepRight, [
    identity,
    ifElse(
        pathSatisfies(isNil, ['options', 'validators']),
        always({}),
        compose(
            objOf('validators'),
            map(spected),
            call(compose(coerceToFn, path(['options', 'validators'])))
        )
    )
])

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

export const createDuckReducers = converge(mergeDeepRight, [
    identity,
    ifElse(
        pathSatisfies(isNil, ['options', 'reducer']),
        createReducer,
        ifElse(
            propSatisfies(isEmpty, 'machines'),
            createReducer,
            createTransitionsPostReducer
        )
    )
])

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

export const createDuckExtender = converge(mergeDeepRight, [
    identity,
    compose(objOf('extendOptions'), extendDuckOptions)
])
