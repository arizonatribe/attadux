import {
    always,
    call,
    compose,
    cond,
    converge,
    defaultTo,
    identity,
    ifElse,
    is,
    nth,
    path,
    pipe,
    prop,
    propIs,
    propOr,
    split,
    unless
} from 'ramda'
import {getRowValidationErrors} from '../duck/validate'
import {createDuckLookup} from '../duck/create'
import {isPromise} from '../util'

export const getStoreName = compose(nth(1), split('/'))

export default (row) => {
    const validationErrors = getRowValidationErrors(row)

    if (validationErrors) {
        throw new Error(validationErrors)
    }

    const getDuckMatchingAction = createDuckLookup(row)
    const getDuckWorkers = pipe(getDuckMatchingAction, propOr({}, 'workers'))
    const getWorkerName = ifElse(
        path(['meta', 'worker']),
        converge(unless(is(String)), [
            pipe(prop('type'), always),
            path(['meta', 'worker'])
        ]),
        always(null)
    )
    const getWorker = pipe(getWorkerName, prop)
    const findActionWorker = converge(call, [getWorker, getDuckWorkers])
    const makeWorkerTask = workerName => cond([
        [is(Function), identity],
        [propIs(Function, workerName), prop(workerName)],
        [propIs(Function, 'run'), prop('run')]
    ])

    return ({dispatch, getState}) => next => action => {
        const workerName = getWorkerName(action)
        if (workerName) {
            const workerTask = pipe(
                findActionWorker,
                defaultTo({}),
                makeWorkerTask(workerName)
            )(action)

            if (is(Function, workerTask)) {
                const storeName = getStoreName(action.type)
                const message = {
                    action,
                    state: storeName ? getState()[storeName] : {}
                }
                const result = workerTask(message)

                if (isPromise(result)) {
                    result.then(asyncResult => {
                        if (prop('type', asyncResult)) {
                            dispatch(asyncResult)
                        }
                    })
                } else if (prop('type', result)) {
                    dispatch(result)
                }
            }
        }
        return next(action)
    }
}
