/* eslint "max-len": "off" */
import {always, assocPath, T} from 'ramda'
import {createDuckLookup, noDucks} from './helpers/duck'
import {isActionTypeInCurrentState, noMachines} from './helpers/machines'
import {validateMiddlwareDucks} from './schema'

// TODO : Implement validationLevel as a per-duck prop and use it to validate as:
//
//   STRICT: isActionTypeInCurrentState
//   CANCEL: !isPayloadValid
//   PRUNE: pruneInvalidFields
//   LOG: getValidationErrors
//
// validationLevel: [STRICT, CANCEL (default), PRUNE, LOG]
//
// TODO: Remove the strictTransitions implementation and roll it up into the
// STRICT setting for validationLevel

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
            getValidationErrors = always(null),
            pruneInvalidFields = always(action),
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
