import {
    __,
    all,
    allPass,
    always,
    any,
    both,
    compose,
    contains,
    converge,
    curry,
    defaultTo,
    either,
    equals,
    filter,
    has,
    head,
    identity,
    ifElse,
    init,
    insert,
    is,
    isEmpty,
    isNil,
    map,
    mergeDeepWith,
    keys,
    last,
    memoize,
    not,
    pair,
    path,
    pick,
    pickBy,
    prop,
    reduce,
    reject,
    split,
    T,
    toPairs,
    toPairsIn,
    type as getType,
    values,
    valuesIn,
    zipObj
} from 'ramda'
import {
    isDux,
    isValidPropName,
    isNotBlankString,
    isNotNil,
    isPrimitiveish,
    isTransitionPossible,
    isPlainObj
} from './is'

const asArray = str => (is(Array, str) ? str : Array(str))

export const invokeIfFn = (fn) => (is(Function, fn) ? fn : always(fn))

/**
 * Simplest of common reducer functions that merges an array of key/value pairs into a single object
 *
 * @func
 * @sig ({k: v}, [k, v]) -> {k: v}
 * @param {Object} returnObj Accumulator object that each key/val pair will be
 * merged into
 * @param {Array} pairs A simple key/value pair array (just two indexes in the array)
 * @returns {Objedt} The merged object of key/value pairs
 */
export const listOfPairsToOneObject = (returnObj, [key, val]) => ({...returnObj, [key]: val})

/**
 * Merges multiple ducks into one flattened Object (which is hilariously being called a row, snicker, snicker)
 *
 * @func
 * @sig ({k: v}...) -> {k: v}
 * @param {...Object} ducks One or more ducks to merge into one row
 * @returns {Object} A single object composed of many ducks
 */
export const createRow = (...ducks) =>
    compose(
        reduce((row, duck) => ({...row, [duck.store]: duck}), {}),
        filter(allPass([has('store'), has('namespace'), isDux]))
    )(ducks)

/**
 * A curried function that examines the result of a [spected](https://github.com/25th-floor/spected) validator on a given
 * input object and replaces the validation failures with the original value
 * from the input object.
 *
 * @func
 * @sig {k: v} -> {k: v} -> {k: v}
 * @param {Object} original The input object which when pushed through a validator yielded the associated validations
 * @param {Object} validations An object of validation results (true for pass, String[] for fails)
 * @returns {Object} The validations result pruned of all invalid fields
 */
export const pruneInvalidFields = curry((original, validations) =>
    compose(
        reduce((prunedObj, [key, val]) => {
            const value = isPlainObj(val) ? pruneInvalidFields(original[key], val) : val
            if (isPlainObj(value) && isEmpty(value)) {
                return prunedObj
            }
            return {
                ...prunedObj,
                [key]: value === true ? original[key] : value
            }
        }, {}),
        reject(pairs => is(Array, pairs[1])),
        toPairsIn
    )(validations)
)

/**
 * A function that inspects a validations object (validated fields are Bools of `true` and
 * invalid fields are arrays of error messages) and removes everything but the errors
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} validations An object of validation results (true for pass, String[] for fails)
 * @returns {Object} The validations result pruned of all valid fields
 */
export const pruneValidatedFields = compose(
    reduce((prunedObj, [key, val]) => {
        const value = isPlainObj(val) ? pruneValidatedFields(val) : val
        if (isPlainObj(value) && isEmpty(value)) {
            return prunedObj
        }
        return {...prunedObj, [key]: value}
    }, {}),
    reject(pairs => pairs[1] === true),
    toPairsIn
)

/**
 * Inspects an Object (can even be nested) of validation results, for props which failed validation.
 * Because the [spected](https://github.com/25th-floor/spected) tool follows a common validations format
 * where failed validations are Arrays of validation errors (strings) and validated props are simply marked `true`,
 * this function is only doing a quick, simple check for any props that are arrays.
 *
 * @func
 * @sig {k: v} -> Boolean
 * @param {Object} validations
 * @returns {Boolean}
 */
export const anyValidationFailures = (validations = {}) =>
    compose(
        any(either(both(isPlainObj, anyValidationFailures), is(Array))),
        valuesIn
    )(validations)

/**
 * Creates a function that will receive a dispatched action and apply a validator function that
 * matches its action type (if one exists). The set of validator functions from
 * which to match the action type is the only dependency.
 *
 * @func
 * @sig {k: v} -> (a -> Boolean)
 * @param {Object} validators An object of curried [spected](https://github.com/25th-floor/spected) validator functions
 * @returns {Function} A validator function to be applied against a dispatched action
 */
export const createPayloadValidator = (validators = {}) =>
    (action = {}) =>
        compose(
            not,
            anyValidationFailures,
            validate => validate(action),
            defaultTo(T),
            prop(__, validators),
            prop('type')
        )(action)

/**
 * A simple function that checks an Object for a prop called "needsExtraction"
 * and determines if it is set to `true`
 *
 * @func
 * @sig {k: v} -> Boolean
 * @param {Object}
 * @returns {Boolean}
 */
export const needsExtraction = compose(equals(true), prop('needsExtraction'))

/**
 * Helper utility to assist in composing the selectors.
 * Previously defined selectors can be used to derive future selectors.
 * Any selector which is a pre-extracted state is expected to have a
 * `needsExtraction: true` and an accompanying `justAddDuckSelectors` prop
 * which performs the extraction. This function creates a sort of running total
 * of all selectors and passes them into each `justAddDuckSelectors()`.
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} selectors An Object of selector functions, some of which may
 * need to be extracted (those which require access to fellow selectors)
 * @returns {Object} selectors, but now with access to fellow selectors
 */
export const deriveSelectors = (selectors = {}) =>
    compose(
        reduce((composedSelectors, [key, selector]) => ({
            ...composedSelectors,
            [key]: selector.justAddDuckSelectors(composedSelectors)
        }), selectors),
        toPairs,
        pickBy(needsExtraction)
    )(selectors)

/**
 * A simple, Ramda implementation of Reselect's `createSelector()` function,
 * taken from [this example](https://twitter.com/sharifsbeat/status/891001130632830976)
 * The cost of all the Ramda functions which make up Attadux has already been
 * paid, so may as well save on another dependency. You can still use Reselect
 * if you prefer; they both work the same.
 *
 * @func
 * @sig (*... -> a) -> (*... -> a)
 * @ param {...Function} selectors One or more selector functions to be "merged" into one
 * @returns {Function} A memoized "selector" function
 */
export const createSelector = (...selectors) =>
    memoize(converge(last(selectors), init(selectors)))

/**
 * Selectors that require one or more of the existing selectors are built using this helper,
 * and the extraction function is passed in as a param. The simplest type of
 * extractor function that this helper was initially built to handle would be:
 *
 * selectors => state => selectors.getSomethingFrom(state)
 *
 * Additionally, the return Object is in a ready-to-be-extracted state (which is
 * why it is flagged `needsExtraction: true`) and so invoking its
 * `justAddDuckSelectors()` will perform the final step of running the extractor
 * (ideally when the rest of the selectors are all being derived)
 *
 * @func
 * @sig Function -> {k: v}
 * @param {Function} extractFunction A helper that will extract all the existing selectors
 * @returns {Object}
 */
export const createDuckSelector = (extractFunction) => ({
    needsExtraction: true,
    justAddDuckSelectors(allSelectorsObject = {}) {
        const extracted = extractFunction(allSelectorsObject)
        if (Array.isArray(extracted)) {
            return createSelector(...extracted)
        }
        return extracted
    }
})

export const concatOrReplace = (left, right) =>
    (is(Array, left) ? [...left, ...(is(Array, right) ? right : [right])] : right)
export const leftValIfRightIsTrue = (left, right) => (right === true ? left : right)
export const leftValIfRightIsNotTrue = (left, right) => (right !== true ? left : right)
export const simpleMergeStrategy = (parent, child) => {
    if (getType(parent) !== getType(child) || isNil(child)) {
        return parent
    } else if (isPrimitiveish(child) || is(Function, child)) {
        return child
    }
    return [...parent, ...child]
}

export const createExtender = (parentDuck, childDuckOptions) =>
    (key) => {
        if ([childDuckOptions, parentDuck].some(d => is(Function, d[key]))) {
            return {
                [key]: duck => {
                    const parent = invokeIfFn(parentDuck[key])(duck)
                    return {...parent, ...invokeIfFn(childDuckOptions[key])(duck, parent)}
                }
            }
        } else if (isNil(childDuckOptions[key])) {
            return isNil(parentDuck[key]) ? {} : {[key]: parentDuck[key]}
        }
        return {[key]: mergeDeepWith(simpleMergeStrategy, parentDuck[key], childDuckOptions[key])}
    }

export const createMachineStates = (machine = {}, {types} = {}) =>
    compose(
        Object.freeze,
        reduce(listOfPairsToOneObject, {}),
        map(([state, transitions]) => ([
            state,
            pick(
                compose(
                    map(head),
                    filter(compose(contains(__, values(types)), head)),
                    filter(compose(has(__, machine), last)),
                    filter(all(is(String))),
                    toPairs
                )(transitions),
                transitions
            )
        ])),
        filter(both(compose(is(String), head), compose(isPlainObj, last))),
        toPairs
    )(machine)

export const createMachines = (machines = {}, context = {}) => (
    compose(
        Object.freeze,
        reduce(listOfPairsToOneObject, {}),
        map(([name, machine]) => ([name, createMachineStates(machine, context)])),
        toPairs
    )(machines)
)
/**
 * Helper utility to assist in creating the constants and making them immutable.
 *
 * @param {object} constants object which must contain only primitive values or arrays of primitives
 * @returns {object} constants parsed, validated and frozen
 */
export const createConstants = (consts = {}) => (
    /* no nested functions or objects, just primitives or conversion of arrays
     * of primitives into simple objects whose keys and vals are the same */
    (!isPrimitiveish(consts) && !is(Array, consts) && is(Object, consts)) ?
        compose(
            Object.freeze,
            reduce(listOfPairsToOneObject, {}),
            filter(isNotNil),
            map(([name, value]) => {
                if (is(Array, value)) {
                    /* Creates an object whose keys and values are identical */
                    return [
                        name,
                        Object.freeze(
                            zipObj(value.filter(isPrimitiveish), value.filter(isPrimitiveish))
                        )
                    ]
                } else if (isPrimitiveish(value)) {
                    /* Otherwise skips any modifications */
                    return [name, value]
                }
                return null
            }),
            toPairs
        )(consts)
    : {}
)

export const createTypes = ({namespace, store} = {}) =>
    types => zipObj(
        types, types.map(type => `${namespace || ''}/${store || ''}/${type}`)
    )

export const findMachineName = ({type, machineName} = {}, currentState = '', {machines} = {}) => {
    if (machineName) {
        if (isTransitionPossible(type, currentState, machines[machineName])) {
            return machineName
        }
        return null
    }

    let mName
    keys(machines).some(name => {
        if (isTransitionPossible(type, currentState, machines[name])) {
            mName = name
            return true
        }
        return false
    })
    return mName
}

export const getStateMachinesPropPath = ifElse(
    allPass([is(String), contains('.'), isValidPropName]),
    split('.'),
    compose(
        ifElse(isEmpty, ['states'], identity),
        filter(isNotBlankString),
        ifElse(is(String), Array, identity)
    )
)
export const getDefaultStateForMachines = (machines = {}) =>
    reduce((obj, key) => ({...obj, [key]: 'initial'}), {}, keys(machines || {}))
export const getCurrentState = (state, {machines = {}, stateMachinesPropName = ''} = {}) => ({
    ...reduce((obj, key) => ({...obj, [key]: 'initial'}), {}, keys(machines)),
    ...compose(pick(keys(machines)), defaultTo({}), path(asArray(stateMachinesPropName)))(state)
})
export function getNextState(state, action = {}) {
    const currentState = getCurrentState(state, this)
    return compose(
        reduce(listOfPairsToOneObject, {}),
        map(([name, machine]) => compose(
            pair(name),
            ifElse(isNotNil, identity, always(currentState[name])),
            prop(action.type),
            defaultTo({}),
            prop(currentState[name])
        )(machine)),
        toPairs
    )(this.machines)
}
export function getNextStateForMachine(machineName = '') {
    return (state, action = {}) =>
        compose(
            ifElse(
                isTransitionPossible(action.type, __, prop(machineName, this.machines)),
                compose(path(__, this.machines), insert(1, __, [machineName, action.type])),
                identity
            ),
            prop(machineName),
            defaultTo({}),
            path(asArray(this.stateMachinesPropName))
        )(state)
}
export const isActionTypeInCurrentState = (state, action = {}, {machines, stateMachinesPropName}) => {
    const currentState = getCurrentState(state, {machines, stateMachinesPropName})
    return compose(
        any(([name, machine]) => compose(
            isNotNil,
            prop(action.type),
            defaultTo({}),
            prop(__, machine),
            prop(name)
        )(currentState)),
        toPairs
    )(machines)
}
