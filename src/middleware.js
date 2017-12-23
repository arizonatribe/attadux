import {__, compose, defaultTo, nth, prop, split, T} from 'ramda'
import {mapPath, currentStateHasType} from './helpers'

export default (dux) => ({getState}) => next => action => {
    const {
        machines,
        getNextState = T,
        isPayloadValid = T,
        strictTransitions = false,
        stateMachinesPropName = 'states'
    } = compose(
        defaultTo({}),
        prop(__, dux),
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
        ...mapPath(
            stateMachinesPropName,
            getNextState(getState(), action, dux)
        )
    }
}
