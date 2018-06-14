import {compose, is, isNil, map, path, reject, unnest, values} from 'ramda'
import {getRowValidationErrors} from '../duck/validate'

export default (row) => {
    const validationErrors = getRowValidationErrors(row)

    if (validationErrors) {
        throw new Error(validationErrors)
    }

    const multipliers = compose(values, reject(isNil), map(path(['multipliers'])))(row)

    return ({dispatch}) => next => action => {
        next(action)

        multipliers.filter(multiplierMap => multiplierMap[action.type]).forEach(multiplierMap => {
            const fanout = multiplierMap[action.type]
            const nextActions = fanout(action)
            if (is(Array, nextActions)) {
                unnest(nextActions)
                    .filter(na => na.type && na.type !== action.type)
                    .forEach(nextAction => dispatch(nextAction))
            }
        })
    }
}
