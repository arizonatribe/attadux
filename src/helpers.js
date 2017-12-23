import {
    always,
    any,
    assocPath,
    both,
    compose,
    converge,
    curry,
    either,
    filter,
    has,
    identity,
    ifElse,
    init,
    is,
    isEmpty,
    isNil,
    map,
    mergeDeepWith,
    keys,
    last,
    memoize,
    path,
    pick,
    pickBy,
    reduce,
    reject,
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
    needsExtraction,
    isPrimitiveish,
    isTransitionPossible,
    isPlainObj
} from './is'

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
export const createConstants = (consts = {}) => {
    /* no nested functions or objects, just primitives or conversion of arrays
     * of primitives into simple objects whose keys and vals are the same */

    if (!isPrimitiveish(consts) && !is(Array, consts) && is(Object, consts)) {
        return Object.freeze(
            toPairs(consts).map(([name, value]) => {
                if (is(Array, value)) {
                    /* Creates an object whose keys and values are identical */
                    return [name, Object.freeze(zipObj(value.filter(isPrimitiveish), value.filter(isPrimitiveish)))]
                } else if (isPrimitiveish(value)) {
                    /* Otherwise skips any modifications */
                    return [name, value]
                }
                return null
            }).filter(f => !isNil(f)).reduce(listOfPairsToOneObject, {})
        )
    }

    return {}
}

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
    Object.keys(machines).some(name => {
        if (isTransitionPossible(type, currentState, machines[name])) {
            mName = name
            return true
        }
        return false
    })
    return mName
}

export const mapPath = (propPath, accumObj) =>
    assocPath(propPath, accumObj, {})
export const getStateMachinesPropPath = (stateMachinesPropName) => ((
        is(String, stateMachinesPropName)
        && stateMachinesPropName.includes('.')
        && isValidPropName(stateMachinesPropName)
    ) ? stateMachinesPropName.split('.') :
    compose(
        ifElse(isEmpty, ['states'], identity),
        filter(isNotBlankString),
        ifElse(is(String), Array, identity)
    )(stateMachinesPropName)
)
export const getDefaultStateForMachines = (machines = {}) => {
    const machineNames = Object.keys(machines || {})
    return reduce((obj, key) => ({...obj, [key]: 'initial'}), {}, machineNames)
}
export const getCurrentState = (state, machines = {}, stateMachinesPropName) => {
    const machineNames = Object.keys(machines || {})
    return {
        ...reduce((obj, key) => ({...obj, [key]: 'initial'}), {}, machineNames),
        ...pick(machineNames, path(stateMachinesPropName, state))
    }
}
export const currentStateHasType = (state, action = {}, {machines, stateMachinesPropName} = {}) =>
    toPairs(machines).some(([name, machine]) =>
        !isNil(machine[getCurrentState(state, machines, stateMachinesPropName)[name]][action.type])
    )
export function getNextState(state, action = {}) {
    const currentState = getCurrentState(state, this.machines, this.stateMachinesPropName)

    return toPairs(this.machines)
        .map(([name, machine]) => {
            const nextState = machine[currentState[name]][action.type]
            if (isNil(nextState)) {
                return [name, currentState[name]]
            }
            return [name, nextState]
        })
        .reduce(listOfPairsToOneObject, {})
}
export function getNextStateForMachine(machineName = '') {
    return (state, action = {}) => {
        const currentState = path(this.stateMachinesPropName, state)[machineName]
        if (isTransitionPossible(action.type, currentState, this.machines[machineName])) {
            return this.machines[machineName][currentState][action.type]
        }
        return currentState
    }
}

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
