import {
    always,
    compose,
    converge,
    forEach,
    has,
    init,
    is,
    isNil,
    keys,
    last,
    memoize,
    pick,
    pickBy,
    reduce,
    toPairs,
    values,
    zipObj
} from 'ramda'
import spected from 'spected'
import {isDuxSelector, isPrimitive, isTransitionPossible} from './is'

export const invokeIfFn = (fn) => (is(Function, fn) ? fn : always(fn))

export const createSelector = (...selectors) =>
    memoize(converge(last(selectors), init(selectors)))

export const createValidator = rules => {
    const fields = Object.keys(rules)
    return compose(
        pickBy(val => val !== true),
        vals => spected(rules, {
            ...reduce((obj, key) => ({...obj, [key]: ''}), {}, fields),
            ...vals
        })
    )
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
        return {[key]: {
            ...parentDuck[key],
            ...childDuckOptions[key]}
        }
    }

export const createMachineStates = (machine = {}, {types} = {}) => {
    const validStates = {}

    toPairs(machine)
        .filter(([state, transitions]) =>
            is(String, state)
            && values(transitions).every(st => is(String, st) && has(st, machine))
            && keys(transitions).some(at => is(String, at) && values(types).includes(at))
        )
        .forEach(([state, transitions]) => {
            validStates[state] = pick(
                keys(transitions).filter(at => is(String, at) && values(types).includes(at)),
                transitions
            )
        })

    return Object.freeze(validStates)
}

export const createMachines = (machines = {}, context = {}) => {
    const validMachines = {}
    toPairs(machines).forEach(([name, machine]) => {
        validMachines[name] = createMachineStates(machine, context)
    })
    return Object.freeze(validMachines)
}

/**
 * Helper utility to assist in creating the constants and making them immutable.
 *
 * @param {object} constants object which must contain only primitive values or arrays of primitives
 * @returns {object} constants parsed, validated and frozen
 */
export const createConstants = (consts = {}) => {
    const constants = {}

    /* no nested functions or objects, just primitives or conversion of arrays
     * of primitives into simple objects whose keys and vals are the same */

    if (!isPrimitive(consts) && !is(Array, consts) && is(Object, consts)) {
        toPairs(consts).forEach(([name, value]) => {
            if (is(Array, value)) {
                /* Creates an object whose keys and values are identical */
                constants[name] = Object.freeze(zipObj(value.filter(isPrimitive), value.filter(isPrimitive)))
            } else if (isPrimitive(value) || is(RegExp, value)) {
                /* Otherwise assigns  */
                constants[name] = value
            }
        })
    }

    /* Freeze everything, to make immutable (the zipped objects were already frozen when created) */
    return Object.freeze(constants)
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

export const getCurrentState = (state, machines = {}) => {
    const machineNames = Object.keys(machines || {})
    return {
        ...reduce((obj, key) => ({...obj, [key]: 'initial'}), {}, machineNames),
        ...pick(machineNames, state.states)
    }
}

export const currentStateHasType = (state, action = {}, {machines} = {}) =>
    toPairs(machines).some(([name, machine]) =>
        !isNil(machine[getCurrentState(state, machines)[name]][action.type])
    )

export function getNextState(state, action = {}) {
    const currentState = getCurrentState(state, this.machines)

    return toPairs(this.machines)
        .map(([name, machine]) => {
            const nextState = machine[currentState[name]][action.type]
            if (isNil(nextState)) {
                return [name, currentState[name]]
            }
            return [name, nextState]
        })
        .reduce((machine, [name, st]) => ({...machine, [name]: st}), {})
}

export function getNextStateForMachine(machineName = '') {
    return (state, action = {}) => {
        const currentState = state.states[machineName]
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
