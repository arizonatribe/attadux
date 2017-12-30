import {
    __,
    all,
    allPass,
    always,
    any,
    anyPass,
    both,
    compose,
    contains,
    curry,
    defaultTo,
    filter,
    has,
    head,
    identity,
    ifElse,
    insert,
    is,
    isEmpty,
    isNil,
    map,
    keys,
    last,
    pair,
    path,
    pick,
    prop,
    reduce,
    split,
    toPairs,
    values
} from 'ramda'

import {coerceToString, listOfPairsToOneObject, coerceToArray} from './coerce'

import {isValidPropName, isNotBlankString, isNotNil, isPlainObj} from './is'

export const noMachines = compose(anyPass([isNil, isEmpty]))

/**
 * Checks to see whether a given machine allows for a given transition, provided its current state
 *
 * @func
 * @sig String -> String -> {k: v} -> Boolean
 * @param {String} transitionName A string value representing a potential state transition
 * @param {String} currentState A string value representing the current state
 * @param {Object} machine A state machine which contains the possible states and their associated transitions
 * @returns {Boolean} whether or not the transition is possible from the current state
 */
export const isTransitionPossible = curry((transitionName, currentState, machine) =>
    compose(
        has(coerceToString(transitionName)),
        defaultTo({}),
        path([coerceToString(currentState)]),
        defaultTo({})
    )(machine)
)

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

export const createMachines = (machines = {}, context = {}) =>
    compose(
        Object.freeze,
        reduce(listOfPairsToOneObject, {}),
        map(([name, machine]) => ([name, createMachineStates(machine, context)])),
        toPairs
    )(machines)

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
    ...compose(pick(keys(machines)), defaultTo({}), path(coerceToArray(stateMachinesPropName)))(state)
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
            path(coerceToArray(this.stateMachinesPropName))
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
