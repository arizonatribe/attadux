import {always, compose, is, nth, path, pipe, prop, propIs, propOr, split, unless} from 'ramda'
import {getRowValidationErrors} from '../duck/validate'
import {createDuckLookup} from '../duck/create'

export const getStoreName = compose(nth(1), split('/'))

export default (row) => {
    const validationErrors = getRowValidationErrors(row)

    if (validationErrors) {
        throw new Error(validationErrors)
    }

    const getDuckMatchingAction = createDuckLookup(row)

    return ({dispatch, getState}) => next => async action => {
        if (path(['meta', 'worker'])(action)) {
            const {workers = {}} = getDuckMatchingAction(action)
            const getWorker = pipe(
                path(['meta', 'worker']),
                unless(is(String), always(action.type)),
                propOr(Promise.resolve)
            )(action)
            const worker = getWorker(workers)

            const storeName = getStoreName(action.type)
            const message = {
                action,
                state: storeName ? getState()[storeName] : {}
            }

            let result
            if (is(Function, worker)) {
                result = await worker(message)
            } else if (propIs(Function, 'run', worker)) {
                result = await worker.run(message)
            }

            if (prop('type', result)) {
                dispatch(result)
            }
        }
        return next(action)
    }
}
