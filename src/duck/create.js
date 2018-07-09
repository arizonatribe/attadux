import {
  __,
  adjust,
  all,
  allPass,
  always,
  anyPass,
  ap,
  applySpec,
  applyTo,
  assoc,
  assocPath,
  both,
  call,
  compose,
  converge,
  curry,
  either,
  evolve,
  filter,
  head,
  identity,
  ifElse,
  is,
  isEmpty,
  isNil,
  juxt,
  keys,
  map,
  mergeAll,
  mergeDeepRight,
  not,
  nth,
  objOf,
  of,
  path,
  pathSatisfies,
  pick,
  prop,
  propEq,
  propSatisfies,
  reduce,
  split,
  unapply,
  unless,
  when
} from 'ramda'
import spected from 'spected'
import {shapeline, makeShaper} from 'shapey'
import {createMachines, getDefaultStateForMachines} from '../machines'
import {createTransitionsPostReducer, createReducer} from '../reducers'
import {deriveSelectors} from '../selectors'
import {makeWorkers} from '../workers'
import {makeQueries, copyRawQueriesToConsts} from '../queries'
import {metadataEvolvers, isDux} from './schema'
import {createTypes} from '../types'
import {
  coerceToFn,
  isEffect,
  isEnhancer,
  isNotEmpty,
  isPlainObj,
  isSpecOrFunction,
  isStringieThingie
} from '../util'
import {createDuckSchemaValidator} from './validate'
import {makeEffectHandler} from '../effects'
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
 * A function which takes an Object of one or more ducks and finds the duck
 * which matches a (potentially) namespaced Redux action
 *
 * @func
 * @sig {k: v} -> {k: v} -> {k: v}
 * @param {Object} row An Object containing one or more ducks
 * @param {Object} action An dispatch Redux action (if belonging to this lib,
 * should have a namespaced action type)
 * @returns {Object} A single duck that corresponds to the dispatched action
 * (defaults to an empty object if none found)
 */
export const createDuckLookup = curry((row, action) =>
  compose(
    unless(isPlainObj, always({})),
    when(isStringieThingie, prop(__, filter(isDux, row))),
    when(is(String), compose(either(nth(1), head), split('/'))),
    path(['type'])
  )(action)
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
        compose(evolve(metadataEvolvers), pick(keys(metadataEvolvers)), copyRawQueriesToConsts),
        compose(objOf('types'), converge(createTypes, [identity, prop('types')]))
      ]),
      prop('validatedOptions')
    ),
    compose(
      when(isNotEmpty, objOf('invalidOptions')),
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
export const createDuckValidators = compose(
  unless(
    propEq('validationLevel', 'PRUNE'),
    evolve({
      validators: map(validator => compose(pruneValidatedFields, validator))
    })
  ),
  converge(mergeDeepRight, [
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
)

/**
 * Creates the Duck's effect handlers (if they are present inside of its 'options' prop).
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} duck A duck which (may) contain effect handlers (inside of its 'options')
 * @returns {Object} A clone of the duck, but now with effect handlers (if they were found inside of 'options').
 */
export const createDuckEffects =
    converge(mergeDeepRight, [
      identity,
      ifElse(
        pathSatisfies(isNil, ['options', 'effects']),
        always([]),
        compose(
          objOf('effects'),
          map(makeEffectHandler),
          filter(isEffect),
          converge(call, [
            compose(coerceToFn, path(['options', 'effects'])),
            identity
          ])
        )
      )
    ])

/**
 * Creates the Duck's throttlers (if they are present inside of its 'options' prop).
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} duck A duck which (may) contain throttlers (inside of its 'options')
 * @returns {Object} A clone of the duck, but now with throttlers (if they were found inside of 'options').
 */
export const createDuckThrottlers =
    converge(mergeDeepRight, [
      identity,
      ifElse(
        pathSatisfies(isNil, ['options', 'throttling']),
        always([]),
        compose(
          objOf('throttling'),
          map(([pattern, milliseconds]) => ([pattern, Number(milliseconds)])),
          filter(allPass([
            is(Array),
            pathSatisfies(anyPass([is(String), is(RegExp), is(Function)]), [0]),
            pathSatisfies(compose(not, isNaN, Number), [1])
          ])),
          converge(call, [
            compose(coerceToFn, path(['options', 'throttling'])),
            identity
          ])
        )
      )
    ])

/**
 * Creates the Duck's debouncers (if they are present inside of its 'options' prop).
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} duck A duck which (may) contain debouncers (inside of its 'options')
 * @returns {Object} A clone of the duck, but now with debouncers (if they were found inside of 'options').
 */
export const createDuckDebouncers =
    converge(mergeDeepRight, [
      identity,
      ifElse(
        pathSatisfies(isNil, ['options', 'debouncing']),
        always([]),
        compose(
          objOf('debouncing'),
          map(([pattern, milliseconds]) => ([pattern, Number(milliseconds)])),
          filter(allPass([
            is(Array),
            pathSatisfies(anyPass([is(String), is(RegExp), is(Function)]), [0]),
            pathSatisfies(compose(not, isNaN, Number), [1])
          ])),
          converge(call, [
            compose(coerceToFn, path(['options', 'debouncing'])),
            identity
          ])
        )
      )
    ])

/**
 * Creates the Duck's queries (if they are present inside of its 'options' prop).
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} duck A duck which (may) contain queries (inside of its 'options')
 * @returns {Object} A clone of the duck, but now with queries (if they were found inside of 'options').
 */
export const createDuckQueries =
    converge(mergeDeepRight, [
      identity,
      ifElse(
        pathSatisfies(isNil, ['options', 'queries']),
        always({}),
        compose(objOf('queries'), makeQueries)
      )
    ])

/**
 * Creates the Duck's workers (if they are present inside of its 'options' prop).
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} duck A duck which (may) contain workers (inside of its 'options')
 * @returns {Object} A clone of the duck, but now with workers (if they were found inside of 'options').
 */
export const createDuckWorkers =
    converge(mergeDeepRight, [
      identity,
      ifElse(
        pathSatisfies(isNil, ['options', 'workers']),
        always({}),
        compose(objOf('workers'), makeWorkers)
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
 * Creates an Object of enhancement functions out of an Object of spec objects
 * (or arrays of spec objects).
 *
 * @func
 * @sig {k: [({k: v} -> {k: v}), ({k: v} -> {k: v}), ...]|({k: v} -> {k: v}) } -> {k: ({k: v} -> {k: v}) }
 * @param {Object[]|Object} enhancements A single enhancement spec or an Array of enhancement specs
 * @returns {Object} An object of enhancer functions, each ready to receive an
 * input object and apply their single or chain of enhancer functions to it.
 */
export const makeEnhancers = ifElse(is(Array), shapeline, makeShaper)

/**
 * Creates the Duck's action enhancers (if they are present inside of its 'options' prop).
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} duck A duck which (may) contain action enhancers (inside of its 'options')
 * @returns {Object} A clone of the duck, but now with action enhancers (if they were found inside of 'options').
 */
export const createDuckActionEnhancers = converge(mergeDeepRight, [
  identity,
  ifElse(
    pathSatisfies(isNil, ['options', 'enhancers']),
    always({}),
    compose(
      objOf('enhancers'),
      ifElse(
        is(Array),
        map(adjust(makeEnhancers, 1)),
        map(makeEnhancers)
      ),
      ifElse(
        isPlainObj,
        filter(isSpecOrFunction),
        filter(both(is(Array), all(isEnhancer)))
      ),
      converge(call, [
        compose(coerceToFn, path(['options', 'enhancers'])),
        identity
      ])
    )
  )
])

/**
 * Creates an Object of multiplier functions out of an Object of spec objects
 * (or arrays of spec objects).
 *
 * @func
 * @sig {k: [({k: v} -> {k: v}), ({k: v} -> {k: v}), ...]|({k: v} -> {k: v}) } -> {k: ({k: v} -> {k: v}) }
 * @param {Object[]|Object} multipliers A single multiplier spec or an Array of multipler specs
 * @returns {Object} An object of multipler functions, each ready to receive an
 * input object and apply their single or many multipler functions to it.
 */
export const makeMultipliers = compose(juxt, map(makeShaper), unless(is(Array), of))

/**
 * Creates the Duck's action multipliers (if they are present inside of its 'options' prop).
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} duck A duck which (may) contain action multipliers (inside of its 'options')
 * @returns {Object} A clone of the duck, but now with action multipliers (if they were found inside of 'options').
 */
export const createDuckActionMultipliers = converge(mergeDeepRight, [
  identity,
  ifElse(
    pathSatisfies(isNil, ['options', 'multipliers']),
    always({}),
    compose(
      objOf('multipliers'),
      map(makeMultipliers),
      converge(call, [
        compose(coerceToFn, path(['options', 'multipliers'])),
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
