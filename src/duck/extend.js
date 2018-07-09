import {
  __,
  all,
  always,
  any,
  applyTo,
  compose,
  concat,
  cond,
  converge,
  curry,
  find,
  has,
  identity,
  ifElse,
  is,
  isNil,
  last,
  map,
  mapAccum,
  mergeAll,
  mergeDeepRight,
  mergeDeepWith,
  pair,
  path,
  objOf,
  of,
  prop,
  reduce,
  T,
  uniq,
  when
} from 'ramda'
import {makeExtendedReducer} from '../reducers'
import {duxDefaults} from './schema'
import {concatOrReplace} from '../types'
import {coerceToFn, simpleMergeStrategy} from '../util'

/**
 * A function that creates an "extender" function which will merges
 * a portion of two duck together at a specified prop
 *
 * @func
 * @sig {k: v} -> {k: v} -> String -> *
 * @param {Object} childDuckOptions A set of options from which a duck can be built
 * @param {Object} parentDuck A duck that has already been built and whose original constructor options will be re-invoked
 * @param {String} key A key name from which to match child options to parent (same prop for both)
 * @returns {Function} A function that takes the name of a prop on a duck, and
 * will merge the parent and child together for that prop
 */
export const createOptionsExtender = curry(
  (childDuckOptions, {options: parentOptions}, key) =>
    cond([
      /* If the key at the child or parent is a function */
      [compose(any(is(Function)), map(prop(key)), pair(parentOptions)),
        /**
                 * then they both need to be invoked
                 * (coerced to fn, if not already)
                 * and then their results are merged
                 */
        always(converge(mergeDeepWith(simpleMergeStrategy), [
          coerceToFn(parentOptions[key]),
          converge(coerceToFn(childDuckOptions[key]), [
            identity,
            coerceToFn(parentOptions[key])
          ])
        ]))
      ],
      /* If the child doesn't have anything at that key, just return from the parent */
      [compose(isNil, prop(key)), always(parentOptions[key])],
      /* Otherwise, simply merge the parent and child together at that key */
      [T, compose(mergeDeepWith(simpleMergeStrategy, parentOptions[key]), prop(key))]
    ])(childDuckOptions)
)

/**
 * Merges the reducer from an existing duck with a reducer inside of a set of configuration options (for a new duck).
 * If a reducer doesn't exist in both sources, no merging is needed, otherwise the merged reducer
 * will always invoke the parent's reducer and feed that result into the child's reducer as its 'state' argument.
 * This way a chain of reducers will always be executed.
 *
 * @func
 * @sig {k: v} -> {k: v} -> {k: v}
 * @param {Object} duck An existing duck, which contains its original
 * configuration options at its 'options' prop.
 * @param {Object} options A set of configuration options for a new duck
 * @returns {Object} A reducer function which is either a chain of reducers (parent first, then child)
 * or one of the reducers (if a reducer wasn't present in both sets of config options)
 */
export const extendReducer = ({options: parentOptions}) =>
  compose(
    ifElse(
      all(has('reducer')),
      compose(makeExtendedReducer(parentOptions), last),
      compose(find(has('reducer')), pair(parentOptions))
    ),
    pair(parentOptions)
  )

/**
 * Merges a set of configuration options (for a new duck) with those of an
 * existing duck (along with defaults for any unsupplied, but required values).
 *
 * @func
 * @sig {k: v} -> {k: v} -> {k: v}
 * @param {Object} duck An existing duck, which contains its original
 * configuration options at its 'options' prop.
 * @param {Object} options A set of configuration options for a new duck
 * @returns {Object} A set of configuration options where schema defaults are
 * merged with the existing duck's configuration options and the new
 * (to-be-built) duck's configuration options
 */
export const extendOptionsForDuck = duck =>
  compose(
    converge(mergeDeepRight, [
      identity,
      compose(objOf('reducer'), extendReducer(duck))
    ]),
    reduce(mergeDeepRight, {}),
    concat([duxDefaults, duck.options]),
    of,
    applyTo(duck),
    coerceToFn
  )

/**
 * Applies a set of evolvers, which are just transformations that are run against a given prop inside of an object.
 * In this case the config options for a new duck are transformed and then
 * those are merged with the same prop(s) inside of the config 'options' of the existing duck.
 *
 * @func
 * @sig [[k: (a -> b)] -> {k: v} -> {k: v} -> {k: v}
 * @param {Array} evolvers An array of arrays (which are key/value pairs whose
 * key is a prop name on an options object and whose value is a function to
 * execute against the corresponding value on the options object)
 * @param {Object} duck An existing duck, which contains its original
 * configuration options at its 'options' prop.
 * @param {Object} options A set of configuration options for a new duck
 * @returns {Object} The options from the original duck extended with the
 * configuration options for a new (to-be-built) duck, according to the
 * transformations defined in the evolvers.
 */
export const createExtendedOptions = curry(
  (evolvers, duck, options) =>
    compose(
      mergeDeepRight(options),
      mergeAll,
      last,
      mapAccum(
        (mergedDuck, [key, builder]) => {
          const option = compose(
            objOf(key),
            when(is(Function), applyTo(key)),
            builder
          )(mergedDuck)
          return [mergeDeepRight(mergedDuck, option), option]
        },
        duck
      )
    )(evolvers)
)

/**
 * Takes an already built duck and the options for building a new one and
 * extends the new options onto the options and simple props of the already built duck.
 * The combined object can be passed as options when creating a new duck.
 *
 * @func
 * @sig {k: v} -> {k: v} -> {k: v}
 * @param {Object} duck An existing duck from which a new duck will be based
 * @param {Object} options A set of options to be merged with those of an
 * existing duck (to be used together whenn creating a new duck)
 * @returns {Object} a merged set of options to be fed into a new duck
 */
export const createDuckExtender = duck => {
  const extendOptions = extendOptionsForDuck(duck)
  return options => {
    const childOptions = extendOptions(options)
    const optionBuilders = [
      ['consts', compose(mergeDeepWith(concatOrReplace, __, childOptions.consts), path(['options', 'consts']))],
      ['types', compose(uniq, concat(childOptions.types), path(['options', 'types']))],
      ['initialState', createOptionsExtender(childOptions)],
      ['machines', createOptionsExtender(childOptions)],
      ['creators', createOptionsExtender(childOptions)],
      ['selectors', createOptionsExtender(childOptions)],
      ['queries', createOptionsExtender(childOptions)],
      ['enhancers', createOptionsExtender(childOptions)],
      ['multipliers', createOptionsExtender(childOptions)],
      ['throttling', createOptionsExtender(childOptions)],
      ['debouncing', createOptionsExtender(childOptions)],
      ['effects', createOptionsExtender(childOptions)],
      ['validators', createOptionsExtender(childOptions)],
      ['workers', createOptionsExtender(childOptions)]
    ]
    return createExtendedOptions(optionBuilders, duck, childOptions)
  }
}
