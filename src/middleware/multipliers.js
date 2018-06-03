import {is} from 'ramda'
import {getRowValidationErrors} from '../duck/validate'
import {createDuckLookup} from '../duck/create'

export default (row) => {
    const validationErrors = getRowValidationErrors(row)

    if (validationErrors) {
        throw new Error(validationErrors)
    }

    const getDuckMatchingAction = createDuckLookup(row)

    return ({dispatch}) => next => action => {
        next(action)

        const {multipliers = {}} = getDuckMatchingAction(action)
        const fanout = multipliers[action.type]

        if (is(Function, fanout)) {
            const nextActions = fanout(action)
            if (is(Array, nextActions)) {
                nextActions.filter(na => na.type !== action.type).forEach(nextAction => dispatch(nextAction))
            }
        }
    }
}
