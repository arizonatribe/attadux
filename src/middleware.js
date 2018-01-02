import {__, always, assocPath, call, compose, defaultTo, F, identity, ifElse, pickBy, prop, T} from 'ramda'
import {isNoNil} from './helpers/is'
import {createDuckLookup} from './helpers/duck'
import {isActionTypeInCurrentState, noMachines} from './helpers/machines'
import {getRowValidationErrors} from './schema'
import {VALIDATION_LEVELS} from './helpers/validations'

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
            getNextState = always({}),
            stateMachinesPropName = 'states',
            validationLevel = always(VALIDATION_LEVELS.CANCEL)
        } = getDuckMatchingAction(action)

        if (noMachines(machines)) {
            return next(action)
        }

        const prevState = getState()

        const validatorsByLevel = {
            /* Simple cancel if payload returns any invalid fields */
            [VALIDATION_LEVELS.CANCEL]: ifElse(isPayloadValid, identity, F),
            /* Always pass the action through, but add a validationErrors prop if there are any */
            [VALIDATION_LEVELS.LOG]: a => always({
                ...action,
                ...pickBy(isNoNil, {validationErrors: getValidationErrors(a)})
            }),
            /* Remove all invalid fields from the action */
            [VALIDATION_LEVELS.PRUNE]: pruneInvalidFields,
            /* Only pass actions that are registered as inputs to the state machine for the current state */
            [VALIDATION_LEVELS.STRICT]: ifElse(
                compose(
                    isActionTypeInCurrentState(prevState, __, {machines, stateMachinesPropName})
                ),
                // useWith(
                //     isActionTypeInCurrentState,
                //     [always(prevState), identity, always({machines, stateMachinesPropName})]
                // ),
                identity,
                F
            )
        }

        const validatedAction = call(
            compose(defaultTo(identity), prop(validationLevel))(validatorsByLevel),
            action
        )

        return validatedAction && {
            ...next(validatedAction),
            ...assocPath(
                stateMachinesPropName, getNextState(prevState, validatedAction), {}
            )
        }
    }
}
