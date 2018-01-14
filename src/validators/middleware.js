import {always, call, compose, converge, defaultTo, F, identity, ifElse, isNil, merge, objOf, prop, T} from 'ramda'
import {isActionTypeInCurrentState, noMachines} from '../machines'
import {getRowValidationErrors} from '../duck/validate'
import {createDuckLookup} from '../duck/create'
import VALIDATION_LEVELS from './levels'

export default (row) => {
    const validationErrors = getRowValidationErrors(row)

    if (validationErrors) {
        throw new Error(validationErrors)
    }

    const getDuckMatchingAction = createDuckLookup(row)

    return ({getState}) => next => action => {
        const {
            machines,
            isPayloadValid = T,
            getValidationErrors = always(null),
            pruneInvalidFields = always(action),
            stateMachinesPropName = 'states',
            validationLevel = VALIDATION_LEVELS.CANCEL
        } = getDuckMatchingAction(action)

        if (noMachines(machines)) return next(action)
        
        const validatorsByLevel = {
            /* Simple cancel if payload returns any invalid fields */
            [VALIDATION_LEVELS.CANCEL]: ifElse(isPayloadValid, identity, F),
            /* Always pass the action through, but add a validationErrors prop if there are any */
            [VALIDATION_LEVELS.LOG]: converge(merge, [identity, compose(
                ifElse(isNil, always({}), objOf('validationErrors')),
                getValidationErrors
            )]),
            /* Remove all invalid fields from the action */
            [VALIDATION_LEVELS.PRUNE]: pruneInvalidFields,
            /* Only pass actions that are registered as inputs to the state machine for the current state */
            [VALIDATION_LEVELS.STRICT]: ifElse(
                converge(isActionTypeInCurrentState,
                    [getState, identity, always({machines, stateMachinesPropName})]
                ),
                identity,
                F
            )
        }

        /* Get the validator matching the validationLevel setting and run it on the action payload */
        const validatedAction = call(
            compose(defaultTo(identity), prop(validationLevel))(validatorsByLevel),
            action
        )

        /* either pass the validated action forward through the middleware chain or stop it right here */
        return validatedAction && next(validatedAction)
    }
}