import {
    always,
    compose,
    converge,
    forEach,
    has,
    init,
    is,
    isNil,
    mergeDeepWith,
    keys,
    last,
    memoize,
    pick,
    pickBy,
    reduce,
    toPairs,
    type as getType,
    values,
    zipObj
} from 'ramda'
import {isDuxSelector, isPrimitive, isTransitionPossible} from './is'

export const listOfPairsToOneObject = (returnObj, [key, val]) => ({...returnObj, [key]: val})

export const invokeIfFn = (fn) => (is(Function, fn) ? fn : always(fn))

export const createSelector = (...selectors) =>
    memoize(converge(last(selectors), init(selectors)))

export const mergeFailedValidationsWithOriginalState = (currentState, validations) =>
    mergeDeepWith(
        (val, stat) => (val === true ? val : stat),
        validations,
        currentState
    )

export const resetFailuresToOriginalState = (possibleNextState, validationsWithOriginalValues) =>
    mergeDeepWith(
        (val, stat) => (val === true ? stat : val),
        validationsWithOriginalValues,
        possibleNextState
    )

export const simpleMergeStrategy = (parent, child) => {
    if (getType(parent) !== getType(child) || isNil(child)) {
        return parent
    } else if (isPrimitive(child) || is(RegExp, child) || is(Function, child)) {
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
            return {[key]: parentDuck[key]}
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
    Object.freeze(toPairs(machines)
        .map(([name, machine]) => ([name, createMachineStates(machine, context)]))
        .reduce(listOfPairsToOneObject, {})
    )
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

    if (!isPrimitive(consts) && !is(Array, consts) && is(Object, consts)) {
        return Object.freeze(
            toPairs(consts).map(([name, value]) => {
                if (is(Array, value)) {
                    /* Creates an object whose keys and values are identical */
                    return [name, Object.freeze(zipObj(value.filter(isPrimitive), value.filter(isPrimitive)))]
                } else if (isPrimitive(value) || is(RegExp, value)) {
                    /* Otherwise skips any modifications */
                    return [name, value]
                }
                return null
            }).filter(f => !isNil(f)).reduce(listOfPairsToOneObject, {})
        )
    }

    return {}
}

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
export const getDefaultStateForMachines = (machines = {}) => {
    const machineNames = Object.keys(machines || {})
    return reduce((obj, key) => ({...obj, [key]: 'initial'}), {}, machineNames)
}

export const getCurrentState = (state, machines = {}, statesProp = 'states') => {
    const machineNames = Object.keys(machines || {})
    return {
        ...reduce((obj, key) => ({...obj, [key]: 'initial'}), {}, machineNames),
        ...pick(machineNames, state[statesProp])
    }
}

export const currentStateHasType = (state, action = {}, {machines, statesProp} = {}) =>
    toPairs(machines).some(([name, machine]) =>
        !isNil(machine[getCurrentState(state, machines, statesProp)[name]][action.type])
    )

export function getNextState(state, action = {}) {
    const currentState = getCurrentState(state, this.machines, this.statesProp)

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

export function getNextStateForMachine(machineName = '', statesProp = 'states') {
    return (state, action = {}) => {
        const currentState = state[statesProp][machineName]
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
export const deriveSelectors = (selectors = {}) => {
    const composedSelectors = {...selectors}

    compose(
        forEach(([key, selector]) => {
            composedSelectors[key] = selector.extractFunction(composedSelectors)
        }),
        toPairs,
        pickBy(isDuxSelector)
    )(composedSelectors)

    return composedSelectors
}
