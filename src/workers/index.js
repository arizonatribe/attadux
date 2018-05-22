import {
    call,
    compose,
    converge,
    identity,
    is,
    isNil,
    map,
    pathOr,
    reject,
    replace
} from 'ramda'
import workerize from 'workerize'
import {coerceToFn} from '../util'

/* eslint-disable no-undef */
const hasWorkers = (
    typeof Worker !== 'undefined' &&
    Worker !== null &&
    typeof Blob !== 'undefined' &&
    Blob !== null
)
/* eslint-enable no-undef */


const makeWorkerString = worker => {
    if (is(Function, worker)) {
        return `export ${worker.then ? 'async ' : ''}${worker.toString()}`
    } else if (is(String, worker)) {
        return compose(
            replace(/^(\s*)const/m, 'export const'),
            replace(/^(\s*)\(/m, 'export default ('),
            replace(/^(\s*)function/m, 'export function'),
            replace(/^(\s*)async\s+\(/m, 'export default async ('),
            replace(/^(\s*)async\s+function/m, 'export async function')
        )(worker)
    }
    return null
}

const makeWorker = compose(
    str => workerize(`${str}`),
    makeWorkerString
)

export const getWorkers = converge(call, [
    compose(coerceToFn, pathOr({}, ['options', 'workers'])),
    identity
])

export const makeWorkers = compose(
    reject(isNil),
    map(hasWorkers ? makeWorker : makeWorkerString),
    getWorkers
)
