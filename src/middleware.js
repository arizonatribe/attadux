/* eslint "max-len": "off" */
import {
    __,
    always,
    assocPath,
    compose,
    defaultTo,
    equals,
    filter,
    isEmpty,
    keys,
    none,
    nth,
    path,
    prop,
    split,
    values,
    T
} from 'ramda'
import {isActionTypeInCurrentState} from './helpers'
import {isPlainObj} from './is'

const isDux = compose(
    equals('Duck'),
    path(['constructor', 'name']),
    defaultTo({})
)

export default (dux) => {
    if (!isPlainObj(dux) || isEmpty(keys(dux)) || none(isDux, values(dux))) {
        throw new Error('No ducks have been provided! To create the Attadux middleware please provide an Object containing one or more ducks')
    }

    const validDux = filter(isDux, dux)

    return ({getState}) => next => action => {
        const {
            machines,
            isPayloadValid = T,
            getNextState = always({}),
            strictTransitions = false,
            stateMachinesPropName = 'states'
        } = compose(
            path(__, validDux),
            nth(1),
            split('/'),
            prop('type')
        )(action)

        if (!isPayloadValid(action) || (
            strictTransitions &&
            !isActionTypeInCurrentState(getState(), action, {machines, stateMachinesPropName})
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
}
