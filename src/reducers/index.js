import {assocPath, compose, converge, curry, defaultTo, identity, path} from 'ramda'
import {addTransitionsToState, getNextState} from '../machines'

export const makeReducer = curry(
    (reducer, duck, state, action) => reducer(state, action, duck)
)

export const makeTransitionsPostReducer = curry(
    (reducer, dux, state, action) => {
        const stateWithTransitions = addTransitionsToState(state, dux)

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

export const createReducer = converge(makeReducer, [
    compose(defaultTo(identity), path(['options', 'reducer'])),
    identity
])

export const createTransitionsPostReducer = converge(makeTransitionsPostReducer, [
    compose(defaultTo(identity), path(['options', 'reducer'])),
    identity
])
