import {
    always,
    call,
    compose,
    cond,
    converge,
    identity,
    invoker,
    is,
    map,
    pathOr,
    pipe,
    reject,
    replace,
    T,
    test as regTest,
    unless
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

const makeWorkerString = cond([
    [is(Function), invoker(0, 'toString')],
    [is(String), identity],
    [T, always('')]
])

const makeExportable = pipe(
    replace(/^(\s*)\(/m, 'export const run = ('),
    replace(/^(\s*)const/m, 'export const'),
    replace(/^(\s*)function\s*\(/m, 'export function run('),
    replace(/^(\s*)function\s+/m, 'export function '),
    replace(/^(\s*)function\*\s+/m, 'export function* '),
    replace(/^(\s*)async\s+\(/m, 'export const run = async ('),
    replace(/^(\s*)async\s+function\s*\(/m, 'export async function run(')
)

const makeWorker = pipe(
    makeWorkerString,
    makeExportable,
    unless(regTest(/^\s*$/), str => workerize(`${str}`))
)

export const getWorkers = converge(call, [
    compose(coerceToFn, pathOr({}, ['options', 'workers'])),
    identity
])

export const makeWorkers = pipe(
    getWorkers,
    map(hasWorkers ? makeWorker : pipe(makeWorkerString, makeExportable)),
    reject(regTest(/^\s*$/))
)
