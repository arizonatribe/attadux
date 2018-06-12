import {
    compose,
    curry,
    filter,
    has,
    isEmpty,
    map,
    path,
    unnest,
    values
} from 'ramda'
import {isPromise} from '../util'

export default (row) => {
    const effects = compose(unnest, values, map(path(['effects'])), filter(has('effects')))(row)

    if (isEmpty(effects)) {
        return () => next => action => next(action)
    }

    const resultHandler = curry((dispatch, next, action, result) => {
        if (path(['type'], result)) {
            if (result.type !== action.type) {
                dispatch(result)
            } else {
                next(result)
            }
        } else {
            next(action)
        }
    })

    return ({dispatch}) => next => {
        const curriedResultHandler = resultHandler(dispatch, next)
        return action => {
            const handleResult = curriedResultHandler(action)
            effects.forEach(effect => {
                const result = effect(action)
                if (isPromise(result)) {
                    result.then(handleResult)
                } else {
                    handleResult(result)
                }
            })
        }
    }
}
