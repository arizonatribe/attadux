import {
  always,
  call,
  compose,
  converge,
  curry,
  defaultTo,
  F,
  identity,
  ifElse,
  isNil,
  merge,
  objOf,
  prop,
  T,
  unless
} from 'ramda'
import {isAction} from '../util/is'
import {isActionTypeInCurrentState, noMachines} from '../machines'
import VALIDATION_LEVELS from '../validators/levels'

export default curry(
  (logger, getDuckMatchingAction, getState, action) => {
    if (isAction(action)) {
      try {
        const {
          machines,
          isPayloadValid = T,
          getValidationErrors = always(null),
          pruneInvalidFields = always(action),
          stateMachinesPropName = 'states',
          validationLevel = VALIDATION_LEVELS.CANCEL
        } = getDuckMatchingAction(action)

        if (noMachines(machines)) {
          return action
        }
                
        const validatorsByLevel = {
          /* Simple cancel if payload returns any invalid fields */
          [VALIDATION_LEVELS.CANCEL]: unless(isPayloadValid, F),
          /* Always pass the action through, but add a validationErrors prop if there are any */
          [VALIDATION_LEVELS.LOG]: converge(merge, [identity, compose(
            ifElse(isNil, always({}), objOf('validationErrors')),
            getValidationErrors
          )]),
          /* Remove all invalid fields from the action */
          [VALIDATION_LEVELS.PRUNE]: pruneInvalidFields,
          /* Only pass actions that are registered as inputs to the state machine for the current state */
          [VALIDATION_LEVELS.STRICT]: unless(
            converge(isActionTypeInCurrentState,
              [getState, identity, always({machines, stateMachinesPropName})]
            ),
            F
          )
        }

        /* Get the validator matching the validationLevel setting and run it on the action payload */
        const validatedAction = call(
          compose(defaultTo(identity), prop(validationLevel))(validatorsByLevel),
          action
        )

        /* either pass the validated action forward through the middleware chain or stop it right here */
        if (isAction(validatedAction)) {
          return validatedAction
        }
      } catch (error) {
        logger.error(`Unable to validate action: ${action.type}`, error)
      }
    }

    return false
  }
)
