import {
    compose,
    curry,
    filter,
    has,
    isNil,
    map,
    pathOr,
    pipe,
    reject,
    unnest,
    values
} from 'ramda'
import createEffectMiddleware from './effects'
import createEnhancerMiddleware from './enhancers'
import createLimiterMiddleware from './limiters'
import createMultiplierMiddleware from './multipliers'
import createValidatorMiddleware from './validators'
import {getRowValidationErrors} from '../duck/validate'
import {createDuckLookup} from '../duck/create'
import {isAction} from '../util/is'
import createLogger from '../util/log'

const makePropSandwich = curry(
    (duckPropName, row) => compose(
        unnest,
        values,
        map(pathOr([], [duckPropName])),
        filter(has(duckPropName))
    )(row)
)

export default (row, loggingEnabled = true) => {
    const validationErrors = getRowValidationErrors(row)
    const logger = createLogger(loggingEnabled)

    if (validationErrors) {
        logger.error('Error validating your row of ducks', validationErrors)
        throw new Error(validationErrors)
    }

    const getDuckMatchingAction = createDuckLookup(row)

    const effects = makePropSandwich('effects', row)
    const debouncing = makePropSandwich('debouncing', row)
    const throttling = makePropSandwich('throttling', row)
    const multipliers = compose(values, reject(isNil), map(pathOr({}, ['multipliers'])))(row)

    const curriedEffects = createEffectMiddleware(logger, effects)
    const limitAction = createLimiterMiddleware(throttling, debouncing)
    const curriedMultipliers = createMultiplierMiddleware(logger, multipliers)
    const curriedEnhancers = createEnhancerMiddleware(logger, getDuckMatchingAction)
    const curriedValidators = createValidatorMiddleware(logger, getDuckMatchingAction)

    return ({dispatch, getState}) => {
        const enhanceAction = curriedEnhancers(dispatch)
        const validateAction = curriedValidators(getState)
        const multiplyAction = curriedMultipliers(dispatch)
        const handleAnyActionEffects = curriedEffects(dispatch)
        return next => action => {
            if (isAction(action)) {
                limitAction(action).then((limitedAction) => {
                    const validatedAction = validateAction(limitedAction)
                    if (isAction(validatedAction)) {
                        const {enhancers = {}} = getDuckMatchingAction(validatedAction)
                        const enhancedAction = pipe(multiplyAction, enhanceAction(enhancers))(validatedAction)
                        next(enhanceAction)
                        handleAnyActionEffects(enhancedAction)
                    }
                }).catch(err => logger.error(`There was a problem throttling or debouncing: "${action.type}"`, err))
            } else {
                logger.error('Looks like something was dispatched that is not a valid action:', action)
            }
        }
    }
}
