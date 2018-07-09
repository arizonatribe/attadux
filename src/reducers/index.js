import {assocPath, compose, converge, curry, defaultTo, identity, isNil, path, prop} from 'ramda'
import {addTransitionsToState, getNextState} from '../machines'

const initialIfNil = (state, duck) => (
  isNil(state) ?
    prop('initialState', duck) :
    state
)

/**
 * Creates a standard ducks reducer, where the duck is the context object,
 * passed as the third param (standard redux reducers are two params, first for
 * the current state of the store and the second is the dispatched redux
 * action).
 * This function is then applied to the state along with a dispatched action
 * that may induce a change in state.
 *
 * @func ((a, b, c) -> a) -> c -> a -> b -> a
 * @param {Function} reducer A function which processes state, action, and duck params
 * to validate the action and (potentially) apply a change to state.
 * @param {Object} duck A duck, containing types, consts, validators and other
 * helpers that are used to carry out the reducer's logic
 * @param {Object} state The current state of a certain portion of the store
 * @param {Object} action A dispatched redux action, with (at minimum) a 'type' prop
 * @returns {Object} Returns a clone of the state, potentially different than
 * the original state if the action object caused a change. Because this is a
 * curried function, you can omit the final two params (state and action) to set
 * this partially curried function as a redux reducer in the combineReducers() setup.
 */
export const makeReducer = curry(
  (reducer, duck, state, action) => reducer(initialIfNil(state, duck), action, duck)
)

/**
 * Creates a standard ducks reducer, where the duck is the context object,
 * passed as the third param (standard redux reducers are two params, first for
 * the current state of the store and the second is the dispatched redux
 * action).
 * This function is then applied to the state along with a dispatched action
 * that may induce a change in state.
 *
 * Appended to this reducer is an automatic validation of the action to see if
 * it is registered as an accepted input to one or more of the state machines
 * (inside the duck), and if so, the corresponding state transition is then applied
 * to the store (at the prop/path which the user specified when they setup their duck).
 *
 * @func
 * @sig ((a, b, c) -> a) -> c -> a -> b -> a
 * @param {Function} reducer A function which processes state, action, and duck params
 * to validate the action and (potentially) apply a change to state.
 * @param {Object} duck A duck, containing types, consts, validators and other
 * helpers that are used to carry out the reducer's logic
 * @param {Object} state The current state of a certain portion of the store
 * @param {Object} action A dispatched redux action, with (at minimum) a 'type' prop
 * @returns {Object} Returns a clone of the state, potentially different than
 * the original state if the action object caused a change. Because this is a
 * curried function, you can omit the final two params (state and action) to set
 * this partially curried function as a redux reducer in the combineReducers() setup.
 */
export const makeTransitionsPostReducer = curry(
  (reducer, dux, state, action) => {
    const stateWithTransitions = addTransitionsToState(initialIfNil(state, dux), dux)

    const updatedStates = assocPath(
      dux.stateMachinesPropName,
      getNextState(stateWithTransitions, action, dux),
      {}
    )

    return {
      ...reducer({...stateWithTransitions, ...updatedStates}, action, dux),
      ...updatedStates
    }
  }
)

/**
 * Creates a layered reducer which invokes one and then the other, passing in
 * the result of the first reducer as the 'state' param to the second reducer.
 *
 * @func
 * @sig {k: v} -> {k: v} -> {k: v} -> {k: v} -> {k: v}
 * @param {Object} parentOptions An options object for a duck being extended, containing
 * types, consts, validators and other helpers that are used to carry out the reducer's logic
 * @param {Object} childOptions An options object for a duck that has yet to be created
 * but which are being extened from an existing duck to validate the action and (potentially)
 * apply a change to state.
 * @param {Object} state The current state of a certain portion of the store
 * @param {Object} action A dispatched redux action, with (at minimum) a 'type' prop
 * @param {Object} duck A duck, containing types, consts, validators and other
 * helpers that are used to carry out the reducer's logic
 * @returns {Object} Returns a clone of the state, potentially different than
 * the original state if the action object caused a change. Because this is a
 * curried function, you can omit the final two params (state and action) to set
 * this partially curried function as a redux reducer in the combineReducers() setup.
 */
export const makeExtendedReducer = curry(
  (parentOptions, childOptions, state, action, duck) =>
    childOptions.reducer(
      parentOptions.reducer(initialIfNil(state), action, duck),
      action,
      duck
    )
)

/**
 * Parses the reducer from a duck (inside the 'options' prop),
 * wraps it with the duck (as context) so that the reducer code will be able to execute
 * (as it likely parses the types or other items from the duck to carry out its logic on the action payload).
 * The resulting function is then ready to be passed state and a dispatched action.
 *
 * @func
 * @sig {k: v} -> ((a, b) -> a)
 * @param {Object} duck A duck, containing a reducer prop inside of its options prop
 * @returns {Function} A wrapped reducer, ready to be invoked with state and action params
 */
export const createReducer = converge(makeReducer, [
  compose(defaultTo(identity), path(['options', 'reducer'])),
  identity
])

/**
 * Parses the reducer from a duck (inside the 'options' prop),
 * wraps it with the duck (as context) so that the reducer code will be able to execute
 * (as it likely parses the types or other items from the duck to carry out its logic on the action payload),
 * and finally a state machine transitions validation is appended to the
 * reducer, so that the portion of the store that tracks state transitions will
 * be updated.
 * The resulting function is then ready to be passed state and a dispatched action.
 *
 * @func
 * @sig {k: v} -> ((a, b) -> a)
 * @param {Object} duck A duck, containing a reducer prop inside of its options prop
 * @returns {Function} A wrapped reducer, ready to be invoked with state and action params
 */
export const createTransitionsPostReducer = converge(makeTransitionsPostReducer, [
  compose(defaultTo(identity), path(['options', 'reducer'])),
  identity
])
