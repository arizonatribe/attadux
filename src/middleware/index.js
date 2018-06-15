import {
    compose,
    curry,
    either,
    filter,
    has,
    isEmpty,
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

const flattenList = curry(
    (duckPropName, row) => compose(
        reject(either(isNil, isEmpty)),
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

    const effects = flattenList('effects', row)
    const debouncing = flattenList('debouncing', row)
    const throttling = flattenList('throttling', row)
    const multipliers = compose(values, reject(either(isNil, isEmpty)), map(pathOr({}, ['multipliers'])))(row)

    const curriedEnhancers = createEnhancerMiddleware(logger)
    const curriedEffects = createEffectMiddleware(logger, effects)
    const limitAction = createLimiterMiddleware(throttling, debouncing)
    const curriedMultipliers = createMultiplierMiddleware(logger, multipliers)
    const curriedValidators = createValidatorMiddleware(logger, getDuckMatchingAction)

    return ({dispatch, getState}) => {
        const enhanceAction = curriedEnhancers(dispatch)
        const validateAction = curriedValidators(getState)
        const multiplyAction = curriedMultipliers(dispatch)
        const handleAnyActionEffects = curriedEffects(dispatch)
        return next => action => {
            if (isAction(action)) {
                limitAction(action)
                    .catch(err => logger.error(`There was a problem throttling or debouncing: "${action.type}"`, err))
                    .then((limitedAction) => {
                        const validatedAction = validateAction(limitedAction)
                        return isAction(validatedAction) ? validatedAction : false
                    })
                    .catch(err => {
                        logger.error(`There was a problem validating: "${action.type}"`, err)
                        next(action)
                    })
                    .then(validatedAction => {
                        if (validatedAction) {
                            const {enhancers = {}} = getDuckMatchingAction(validatedAction)
                            return pipe(multiplyAction, enhanceAction(enhancers))(validatedAction)
                        }
                        return false
                    })
                    .catch(err => {
                        logger.error(`A multiplier and/or enhancer failed for: "${action.type}"`, err)
                        next(action)
                    })
                    .then(enhancedAction => {
                        if (isAction(enhancedAction)) {
                            next(enhancedAction)
                            handleAnyActionEffects(enhancedAction)
                        }
                    })
                    .catch(err => logger.error(`There was a problem executing the effect for: "${action.type}"`, err))
            } else {
                logger.error('Looks like something was dispatched that is not a valid action:', action)
            }
        }
    }
}
