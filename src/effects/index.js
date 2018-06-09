import {
    __,
    compose,
    cond,
    curry,
    evolve,
    F,
    is,
    merge,
    objOf,
    pathEq,
    pathSatisfies,
    pick,
    T,
    test,
    tryCatch,
    unless,
    when
} from 'ramda'
import {isPlainObj} from '../util/is'

export const defaultSuccessHandler = curry((result, action) =>
    compose(
        merge(__, {...unless(isPlainObj, objOf('result'))(result)}),
        when(
            pathSatisfies(is(String), ['type']),
            compose(
                evolve({type: t => `${t.replace(/REQUEST$/i, '')}_SUCCESS`}),
                pick(['type'])
            )
        )
    )(action)
)

export const defaultErrorHandler = curry((error, action) =>
    compose(
        merge({error}),
        when(
            pathSatisfies(is(String), ['type']),
            compose(
                evolve({type: t => `${t.replace(/REQUEST$/i, '')}_ERROR`}),
                pick(['type'])
            )
        )
    )(action)
)

/**
 * Makes a predicate function out of either a String, RegExp, or a Function,
 * which can then be applied to an Object that contains a "type" property.
 * This is meant to be used to evaluate if a Redux action matches the predicate.
 * If neither a String, RegExp, nor Function is supplied here, then the result
 * will be to give back a function that always returns false.
 *
 * @func
 * @sig String|RegExp|({k: v} -> Boolean) -> ({k: v} -> Boolean)
 * @param {String|RegExp|Function} pattern A String to be exactly matched to an
 * Object's "type" property, OR a Regular expression to be matched against it,
 * OR a function to be used to match against any custom criteria on that Object
 * @returns {Function} A predicate function to be applied later to an Object
 * (ideally, one containing a "type" property)
 */
export const makePredicate = cond([
    [is(String), pathEq(['type'])],
    [is(RegExp), compose(pathSatisfies(__, ['type']), test)],
    [is(Function), (fn) => compose(Boolean, fn)],
    [T, F]
])

export const createEffectHandler = curry(
    (pattern, effectHandler, successHandler, errorHandler, action) => when(
        makePredicate(pattern),
        tryCatch(
            compose(result => successHandler(result, action), effectHandler),
            ex => errorHandler(ex, action)
        )
    )(action)
)
