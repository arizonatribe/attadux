import {either, is, isNil, isEmpty} from 'ramda'
import {getRowValidationErrors} from '../duck/validate'
import {createDuckLookup} from '../duck/create'

export default (row) => {
    const validationErrors = getRowValidationErrors(row)

    if (validationErrors) {
        throw new Error(validationErrors)
    }

    const getDuckMatchingAction = createDuckLookup(row)

    return ({dispatch}) => next => action => {
        const {enhancers = {}} = getDuckMatchingAction(action)
        const enhance = enhancers[action.type]

        if (!is(Function, enhance)) return next(action)

        const nextAction = enhance(action)

        if (either(isNil, isEmpty)(nextAction)) return next(action)

        if (nextAction.type !== action.type) dispatch(nextAction)

        return next(nextAction)
    }
}
