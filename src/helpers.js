import {
    __,
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
    filter,
    has,
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
    pair,
    path,
    pick,
    pickBy,
    prop,
    reduce,
    reject,
    split,
    toPairs,
    toPairsIn,
    type as getType,
    values,
    valuesIn,
    zipObj
} from 'ramda'
import {
    isValidPropName,
    isNotBlankString,
    isNotNil,
    needsExtraction,
    isPrimitiveish,
    isTransitionPossible,
    isPlainObj
} from './is'

const asArray = str => (is(Array, str) ? str : Array(str))

export const invokeIfFn = (fn) => (is(Function, fn) ? fn : always(fn))
export const listOfPairsToOneObject = (returnObj, [key, val]) => ({...returnObj, [key]: val})

export const createRow = (...ducks) =>
    compose(
        reduce((row, duck) => ({...row, [duck.store]: duck}), {}),
        filter(has('store'))
    )(ducks)

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

export const anyValidationFailures = (validations = {}) =>
    compose(
        any(either(both(isPlainObj, anyValidationFailures), is(Array))),
        valuesIn
    )(validations)

export const createPayloadValidator = (validators = {}) =>
    (action = {}) =>
        compose(
            anyValidationFailures,
            ({type}) => validators[type](action)
        )(action)

/**
 * Helper utility to assist in composing the selectors.
 * Previously defined selectors can be used to derive future selectors.
 *
 * @param {object} selectors
 * @returns {object} selectors, but now with access to fellow selectors
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
export const createSelector = (...selectors) =>
    memoize(converge(last(selectors), init(selectors)))
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
export const createMachineStates = (machine = {}, {types} = {}) => (
    Object.freeze(
        toPairs(machine).filter(([state, transitions]) =>
            is(String, state)
            && values(transitions).every(st => is(String, st) && has(st, machine))
            && keys(transitions).some(at => is(String, at) && values(types).includes(at))
        ).map(([state, transitions]) => (
            [state, pick(
                keys(transitions).filter(at => is(String, at) && values(types).includes(at)),
                transitions
            )]
        )).reduce(listOfPairsToOneObject, {})
    )
)
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
    ...pick(keys(machines), path(asArray(stateMachinesPropName), state))
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
