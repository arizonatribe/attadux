import {
    __,
    assocPath,
    compose,
    nth,
    path,
    prop,
    split,
    T
} from 'ramda'
import {currentStateHasType} from './helpers'

export default (dux) => ({getState}) => next => action => {
    const {
        machines,
        getNextState = T,
        isPayloadValid = T,
        strictTransitions = false,
        stateMachinesPropName = 'states'
    } = compose(
        path(__, dux),
        nth(1),
        split('/'),
        prop('type')
    )(action)

    if (!isPayloadValid(action) || (
        strictTransitions &&
        !currentStateHasType(getState(), action, {machines, stateMachinesPropName})
    )) {
        return false
    }

    return {
        ...next(action),
        ...assocPath(
            stateMachinesPropName, getNextState(getState(), action), {}
        )
    }
}
