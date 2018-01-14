import {
    __,
    all,
    allPass,
    always,
    any,
    anyPass,
    assocPath,
    both,
    compose,
    contains,
    converge,
    curry,
    defaultTo,
    difference,
    either,
    filter,
    flatten,
    has,
    head,
    identity,
    ifElse,
    is,
    isEmpty,
    isNil,
    map,
    mergeDeepRight,
    keys,
    last,
    pair,
    path,
    pick,
    prop,
    reduce,
    split,
    toPairs,
    uniq,
    useWith,
    values
} from 'ramda'

import {
    coerceToString,
    listOfPairsToOneObject,
    coerceToArray,
    hasNestedProp,
    isStringieThingie,
    isValidPropName,
    isNotBlankString,
    isNotNil,
    isPlainObj
} from '../util'
import {getTypes} from '../types'

/**
 * Simple check to see whether a given duck's machines is empty.
 *
 * @func
 * @sig {k: v} -> Boolean
 * @param {Object} machines A duck's collection of state machines
 * @returns {Boolean} whether or not the machines are empty
 */
export const noMachines = anyPass([isNil, isEmpty])

/**
 * Adds an object containing the current state of all the state machines onto
 * a given section of the redux store
 *
 * @func
 * @sig {k: v} -> {k: v} -> {k: v}
 * @param {Object} duck A duck instance, containing the state machines and the
 * prop name/path to the section of the store where their state is tracked
 * @param {*} state The current state of this portion of the store
 * @returns {Object} original state (or initialState, if state is nil) plus
 * current state of all the state machines
 */
export const addTransitionsToState = curry(
    (state, {initialState = {}, stateMachinesPropName = ['states']}) =>
        compose(
            ifElse(
                hasNestedProp(stateMachinesPropName),
                identity,
                assocPath(stateMachinesPropName, {})
            ),
            defaultTo(initialState)
        )(state)
)

/**
 * Retrieves a unique list all the state transitions possible for a given machine.
 * State machines are objects whose keys are states and whose values are objects
 * inside of which the transition-to state is the value of each of its key/value pairs.
 *
 * @func
 * @sig {k: v} -> [String]
 * @param {Object} machine A single state machine
 * @returns {String[]} A list of unique state transitions for the provided machine
 */
export const getTransitionsForMachine = compose(
    uniq,
    filter(isStringieThingie),
    flatten,
    map(values),
    values
)

/**
 * Retrieves a unique list all the inputs for a given state machine (which correspond to Action Types).
 * State machines are objects whose keys are states and whose values are objects
 * inside of which the input value is the key of each of its key/value pairs.
 *
 * @func
 * @sig {k: v} -> [String]
 * @param {Object} machine A single state machine
 * @returns {String[]} A list of unique inputs to the provided state machine
 */
export const getStateInputsForMachine = compose(
    uniq,
    filter(isStringieThingie),
    flatten,
    map(keys),
    values
)

/**
 * Retrieves a unique list all the inputs for all of a given duck's state machines.
 * State machines are objects whose keys are states and whose values are objects
 * inside of which the input value is the key of each of its key/value pairs.
 *
 * @func
 * @sig {k: v} -> [String]
 * @param {Object} duck A duck containing one or more state machines
 * @returns {String[]} A list of unique inputs to all the state machines for the provided duck
 */
export const getStateInputsForAllMachines = compose(
    uniq,
    flatten,
    map(getStateInputsForMachine),
    values,
    prop('machines')
)

/**
 * Retrieves any invalid inputs from a given duck's state machines.
 * State machines are objects whose keys are states and whose values are objects
 * inside of which the input value is the key of each of its key/value pairs.
 *
 * @func
 * @sig {k: v} -> [String]
 * @param {Object} duck A duck containing one or more state machines and action types
 * @returns {String[]} A list of any invalid inputs for the state machines of the provided duck
 */
export const invalidStateMachineInputs = converge(difference, [getStateInputsForAllMachines, getTypes])
    
/**
 * Checks whether all a given state machine's states are string values.
 * State machines are objects whose keys are states and whose values are objects
 * inside of which the input value is the key of each of its key/value pairs.
 *
 * @func
 * @sig {k: v} -> Boolean
 * @param {Object} machine A single state machine
 * @returns {Boolean} whether or not the states for the state machine are strings
 */
export const areStateNamesStrings = compose(all(is(String)), keys)

/**
 * Checks whether all a given state machine's inputs and transition names are string values.
 * State machines are objects whose keys are states and whose values are objects
 * inside of which the input value is the key and transition is the value of each of its key/value pairs.
 *
 * @func
 * @sig {k: v} -> Boolean
 * @param {Object} machine A single state machine
 * @returns {Boolean} whether or not the inputs and transitions for the state machine are strings
 */
export const areInputsAndTransitionsStrings = compose(
    all(allPass([
        isPlainObj,
        either(isEmpty, compose(
            all(all(is(String))),
            toPairs
        ))
    ])),
    values
)

/**
 * Checks whether all the state machine inputs for a given duck correspond to its action types.
 * State machines are objects whose keys are states and whose values are objects
 * inside of which the input value is the key of each of its key/value pairs.
 *
 * @func
 * @sig {k: v} -> Boolean
 * @param {Object} duck A duck containing one or more state machines and action types
 * @returns {Boolean} whether or not all the inputs for the state machines are among the duck's action types
 */
export const areStateMachineInputsActionTypes = compose(all(isEmpty), invalidStateMachineInputs)

/**
 * Checks if all a state machine's transitions are states in that machine.
 * State machines are objects whose keys are states and whose values are objects
 * inside of which the transition-to state is the value of each of its key/value pairs.
 *
 * @func
 * @sig {k: v} -> Boolean
 * @param {Object} machine A single state machine
 * @returns {Boolean} whether or not all the transition names are also states for a given state machine
 */
export const isEachTransitionAmongMachineStates = useWith(difference, [getTransitionsForMachine, keys])

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

/**
 * Creates a "machine state" object, which can be combined with others to create a single state machine.
 * The keys for a machine state object (called inputs or input values) correspond to the names of redux action types.
 * The values for a machine state object (called transitions) are merely
 * the names of fellow machine state objects (also created by this function).
 *
 * @func
 * @sig {k: v} -> {k: v} -> {k: v}
 * @param {Object} machine A single state machine
 * @param {Object} types An object whose keys/values correspond
 * to redux actions and will be used to set up inputs for the state machine
 * @returns {Object} a validated, immutable state machine
 */
export const createMachineStates = curry((machine = {}, types = {}) =>
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
)

/**
 * Creates a frozen (immutable) object whose keys are all the possible "current state"
 * values for the machine and whose values are objects containing each action type that
 * may produce a transition to another state.
 *
 * @func
 * @sig {k: v} -> {k: v} -> {k: v}
 * @param {Object} machines An object full of one or more state machines
 * @param {Object} duck A duck instance
 * @returns {Object} an object of validated, immutable state machines
 */
export const createMachines = curry((machines, duck) =>
    compose(
        Object.freeze,
        reduce(listOfPairsToOneObject, {}),
        map(([name, machine]) => ([name, createMachineStates(machine, duck.types)])),
        toPairs
    )(machines)
)

/**
 * Creates an string path (array) that the state machine functions will use to
 * lookup and alter the current state of one or more of the state machines.
 * The path supplied to this function can be a single prop name (String) or
 * an Array of prop names that represent a nested prop's path.
 * And if a String is passed in, a dot-separated format is also supported.
 *
 * @func
 * @sig String -> [String]
 * @param {String|String[]} path The prop name or path to the section of the
 * store where the state machines current state is tracked.
 * @returns {String[]} an array of strings representing the nested path to the
 * prop where state machines current state is tracked in the redux store
 */
export const getStateMachinesPropPath = ifElse(
    allPass([is(String), contains('.'), isValidPropName]),
    split('.'),
    compose(
        ifElse(isEmpty, ['states'], identity),
        filter(isNotBlankString),
        ifElse(is(String), Array, identity)
    )
)

/**
 * Builds a flattened object where the keys are the names of each of the duck's state machines,
 * and the values are each set to 'initial'.
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} machines An object containing the definitions for one or more state machines
 * @returns {Object} a flattened object where the current state of each state machine will be tracked
 */
export const getDefaultStateForMachines = (machines = {}) =>
    reduce((obj, key) => ({...obj, [key]: 'initial'}), {}, keys(machines || {}))

/**
 * Retrieves the section of the redux store where the current state is being
 * tracked for one or more state machines. The shape of this section of the store
 * is usually just a flattened object with a single value for each named state
 * machine, representing its current state. Each possible state for any of those
 * is defined in the Ducks.
 *
 * @func
 * @sig {k: v} -> {k: v} -> {k: v}
 * @param {Object} duck A duck instance, containing the state machines and the
 * prop name/path to the section of the store where their state is tracked
 * @param {*} state The current state of this portion of the store
 * @returns {Object} A flattened Object containing the names of each state
 * machine (String) and its current state (String) as key/value pairs
 */
export const getCurrentState = ({machines = {}, stateMachinesPropName} = {}) =>
    compose(
        mergeDeepRight(map(always('initial'), machines)),
        pick(keys(machines)),
        defaultTo({}),
        path(coerceToArray(stateMachinesPropName))
    )

/**
 * Based on the current state of the machines (managed in the store itself) and
 * the rules defined for each state machine (in the ducks), an action is processed
 * and may cause one or more ore the state machines to transition.
 *
 * @func
 * @sig {k: v} -> {k: v} -> {k: v}
 * @param {Object|*} state The current state of this portion of the store
 * @param {Object} action A dispatched redux action
 * @param {Object} duck A duck instance, containing the state machines and the
 * prop name/path to the section of the store where their state is tracked
 * @returns {Object} A flattened Object containing the names of each state
 * machine (String) and its current state (String) as key/value pairs
 */
export const getNextState = curry(
    (state, action, {machines = {}, stateMachinesPropName}) => {
        const currentState = getCurrentState({machines, stateMachinesPropName})(state)
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
        )(machines)
    }
)

/**
 * Checks whether a dispatched action's type is listed among the
 * current state's input values for one or more of the state machines.
 *
 * @func
 * @sig {k: v} -> {k: v} -> {k: v} -> Boolean
 * @param {Object|*} state The current state of this portion of the store
 * @param {Object} action A dispatch redux action
 * @param {Object} duck A duck, which contains both state machines and the
 * corresponding prop name/path in the redux store where their current state is tracked
 * @returns {Boolean} whether or not the dispatched action is listed as an input
 * value for the state machine(s) current state
 */
export const isActionTypeInCurrentState = curry(
    (state, action, {machines, stateMachinesPropName}) => {
        const currentState = getCurrentState({machines, stateMachinesPropName})(state)
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
)
