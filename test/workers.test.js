import test from 'tape'
import {createDuck, extendDuck} from '../src/duck'

test('lets the workers reference the duck instance', (t) => {
    const strAdd = `
        export function add(a, b) {
            return a + b
        }
    `
    const getUser = (id) => ({id, name: 'Huey', greeting: 'quack quack'})
    const strGetUser = `export ${getUser.toString()}`
    const duck = createDuck({
        namespace: 'atta',
        store: 'users',
        types: ['FETCH'],
        workers: {add: strAdd, getUser, notAWorker: null}
    })
    t.deepEqual(duck.workers, {add: strAdd, getUser: strGetUser})
    t.equal(duck.workers.add, strAdd, 'identity for already stringified functions')
    t.equal(duck.workers.getUser, strGetUser, 'stringifies functions')
    t.end()
})

test('extending merges new workers with those from the original duck', (t) => {
    const duck = createDuck({
        namespace: 'a',
        store: 'x',
        workers: {get: val => val}
    })
    const childDuck = extendDuck(duck, {workers: {noop: () => null}})
    t.deepEqual(
        Object.keys(childDuck.workers),
        ['get', 'noop'],
        'verify child duck contains workers from the parent duck'
    )
    t.end()
})

test('lets the child workers access the parent workers', (t) => {
    const d1 = createDuck({
        namespace: 'a',
        store: 'x',
        consts: {baseUrl: 'http://localhost'},
        workers: ({consts}) => ({
            makeUrl: endpoint => `${consts.baseUrl}/${endpoint}`
        })
    })
    const d2 = extendDuck(d1, {
        workers: ({consts}) => ({
            makeUrlWithQs: (endpoint, qsObj) =>
                `${consts.baseUrl}/${endpoint}${Object.entries(qsObj).reduce((str, keyVals) => keyVals.join('='), '?')}`
        })
    })
    /* Not really any point in ever doing this in a worker, just trying to
     * prove access to the parent duck */
    const d3 = extendDuck(d2, {
        workers: (duck, parent) => ({
            descendant: parent.makeUrlWithQs
        })
    })
    t.deepEqual(d3.workers.descendant, d2.workers.makeUrlWithQs)
    t.end()
})
