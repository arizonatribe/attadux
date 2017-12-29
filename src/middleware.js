/* eslint "max-len": "off" */
import {
    __,
    always,
    anyPass,
    assocPath,
    compose,
    complement,
    defaultTo,
    either,
    filter,
    head,
    ifElse,
    isEmpty,
    isNil,
    keys,
    none,
    nth,
    prop,
    split,
    T,
    values
} from 'ramda'
import {isActionTypeInCurrentState} from './helpers'
import {isPlainObj, isDux, isNotBlankString} from './is'
import {validateMiddlwareDucks} from './schema'

const noMachines = compose(anyPass([isNil, isEmpty]))
const noDucks = anyPass([
    complement(isPlainObj),
    compose(isEmpty, keys),
    compose(none(isDux), values)
])
const createDuckLookup = dux =>
    compose(
        defaultTo({}),
        ifElse(
            isNotBlankString,
            prop(__, filter(isDux, dux)),
            always({})
        ),
        either(nth(1), head),
        split('/'),
        prop('type')
    )

export default (dux) => {
    if (noDucks(dux)) {
        throw new Error('No ducks have been provided! To create the Attadux middleware please provide an Object containing one or more ducks')
    }
    if (!validateMiddlwareDucks(dux)) {
        throw new Error('The provided ducks are invalid. You must provide each Duck with state machines whose input values are among the Duck\'s action types and whose transitions are also state names.')
    }

    const getDuckMatchingAction = createDuckLookup(dux)

    return ({getState}) => next => action => {
        const {
            machines,
            isPayloadValid = T,
            getNextState = always({}),
            strictTransitions = false,
            stateMachinesPropName = 'states'
        } = getDuckMatchingAction(action)

        if (!isPayloadValid(action) || (
            strictTransitions &&
            !isActionTypeInCurrentState(getState(), action, {machines, stateMachinesPropName})
        )) {
            return false
        }

        if (noMachines(machines)) {
            return next(action)
        }

        return {
            ...next(action),
            ...assocPath(
                stateMachinesPropName, getNextState(getState(), action), {}
            )
        }
    }
}
