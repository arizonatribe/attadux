import {
    always,
    assocPath,
    call,
    compose,
    converge,
    filter,
    find,
    identity,
    ifElse,
    is,
    isNil,
    map,
    pathOr,
    prop,
    reject
} from 'ramda'
import {coerceToFn} from '../util'

const makeQuery = query => {
    if (is(Array, query)) {
        const buildQuery = find(is(Function), query) || identity
        const raw = find(is(String), query) || ''
        return buildQuery(raw)
    } else if (is(String, query)) {
        return query
    }
    return null
}

export const getQueries = converge(call, [
    compose(coerceToFn, pathOr({}, ['options', 'queries'])),
    identity
])

export const makeQueries = compose(
    reject(isNil),
    map(makeQuery),
    getQueries
)

export const getRawQueries = compose(
    filter(is(String)),
    map(ifElse(is(Array), find(is(String)), always(null))),
    prop('queries')
)

/**
 * Copies the string values from the Duck's queries into `consts.queries`.
 *
 * @func
 * @sig {k: v} -> {k: v}
 * @param {Object} duck A duck which (may) contain queries (inside of its 'options')
 * @returns {Object} A clone of the duck, but now with `consts.queries`.
 */
export const copyRawQueriesToConsts = converge(assocPath(['consts', 'queries']), [getRawQueries, identity])
