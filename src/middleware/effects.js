import {
    compose,
    curry,
    filter,
    has,
    is,
    isEmpty,
    map,
    path,
    prop,
    unnest,
    values
} from 'ramda'
import {getRowValidationErrors} from '../duck/validate'
import {isPromise} from '../util'

export default (row) => {
    const validationErrors = getRowValidationErrors(row)

    if (validationErrors) {
        throw new Error(validationErrors)
    }

    const effects = compose(unnest, values, map(path(['effects'])), filter(has('effects')))(row)

    if (isEmpty(effects)) {
        return () => next => action => next(action)
    }

    const effectHandler = curry((dispatch, next, action, onSuccess, result) => {
        const res = is(Function, onSuccess) ? onSuccess(result) : result
        if (prop('type', res)) {
            if (res.type !== action.type) {
                dispatch(res)
            } else {
                next(res)
            }
        }
    })

    return ({dispatch}) => next => action => {
        next(action)
        effects.forEach(([matchEffect, effect, onSuccess, onError]) => {
            if (
                (is(String, matchEffect) && matchEffect === action.type) ||
                (is(RegExp, matchEffect) && matchEffect.test(action.type)) ||
                (is(Function, matchEffect) && matchEffect(action))
            ) {
                try {
                    const result = effect(action)
                    if (isPromise(result)) {
                        result.then(effectHandler(dispatch, next, action, onSuccess))
                    } else {
                        effectHandler(dispatch, next, action, result, onSuccess)
                    }
                } catch (error) {
                    onError(error)
                }
            }
        })
    }
}
