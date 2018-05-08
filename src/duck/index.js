import {always, compose, converge, mergeDeepRight, uncurryN} from 'ramda'
import {duxDefaults} from './schema'
import {
    createDuckQueries,
    createDuckValidators,
    createDuckMachines,
    createDuckInitialState,
    createDuckSelectors,
    createDuckActionCreators,
    createDuckActionEnhancers,
    createDuckReducer,
    createDuckMetadata,
    createValidationMiddlewareHelpers
} from './create'
import {createDuckExtender} from './extend'

/**
 * Builds a duck from a set of options (whose keys are validated against
 * a whitelist and corresponding schema), including selectors, action creators,
 * state machines, validators, a reducer and basic metadata
 * (including the required 'namespace' and 'store' name).
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} options A set of functions, objects (of various schema types)
 * and basic metadata which will go into the finished duck.
 * @returns {Object} A fully built duck, complete with types, action creators,
 * a reducer, selectors, state machines, validators and some basic metadata.
 */
export const createDuck = compose(
    Object.freeze,
    createDuckReducer,
    createValidationMiddlewareHelpers,
    createDuckActionCreators,
    createDuckActionEnhancers,
    createDuckSelectors,
    createDuckInitialState,
    createDuckMachines,
    createDuckValidators,
    createDuckQueries,
    createDuckMetadata,
    mergeDeepRight(duxDefaults)
)

/**
 * Builds a function that will extend a duck with options to be supplied at a later time.
 * Those options (supplied later) may include selectors, action creators, state machines,
 * validators, a reducer and basic metadata (including the required 'namespace' and 'store' name).
 *
 * @func
 * @sig {k: v} -> ({k: v} -> {k: v})
 * @param {Object} duck A 'parent' duck whose own options will be merged with those supplied for the new (child) duck.
 * @returns {Object} An extender function, ready to be supplied a set of options to extend the original duck.
 */
export const createExtenderForDuck = converge(
    compose, [always(createDuck), createDuckExtender]
)

/**
 * Builds a duck from an existing duck _and_ a set of options for a new duck.
 * This function is meant to be invoked when both the duck and the child options
 * are available together (not a curried function).
 *
 * @func
 * @sig {k: v} -> {k: v} -> {k: v}
 * @param {Object} duck A 'parent' duck whose own options will be merged with
 * those supplied for the new (child) duck.
 * @param {Object} options A set of functions, objects (of various schema types)
 * and basic metadata which will go into the finished duck, merged with the parent duck.
 * @returns {Object} A fully built duck, complete with types, action creators,
 * a reducer, selectors, state machines, validators and some basic metadata,
 * merged from the parent duck along with the options supplied for the new duck.
 */
export const extendDuck = uncurryN(2, createExtenderForDuck)
