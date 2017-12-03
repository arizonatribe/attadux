import test from 'tape'
import Duck from '../src/Duck'

test('lets the creators reference the duck instance', (t) => {
    const duck = new Duck({
        types: ['FETCH'],
        creators: ({types}) => ({
          get: id => ({type: types.FETCH, id})
        })
    })
    t.deepEqual(
        duck.creators.get(15),
        {type: duck.types.FETCH, id: 15}
    )
    t.end()
})

test('lets the creators access the selectors', (t) => {
    const duck = new Duck({
        selectors: {
            sum: numbers => numbers.reduce((sum, n) => sum + n, 0)
        },
        creators: ({selectors}) => ({
            calculate: () => dispatch => {
                dispatch({
                    type: 'CALCULATE',
                    payload: selectors.sum([1, 2, 3])
                })
            }
        })
    })
    let dispatchedPayload = {}
    const dispatch = action => {
        dispatchedPayload = action
    }
    duck.creators.calculate()(dispatch)
    t.notDeepEqual(dispatchedPayload, {}, 'Action was not dispatched')
    t.deepEqual(dispatchedPayload, {type: 'CALCULATE', payload: 6})
    t.end()
})

test('extending merges new creators with those from the original duck', (t) => {
    const duck = new Duck({
        creators: () => ({
            get: () => ({type: 'GET'})
        })
    })
    const childDuck = duck.extend({
        creators: () => ({
            delete: () => ({type: 'DELETE'})
        })
    })
    t.deepEqual(
        Object.keys(childDuck.creators),
        ['get', 'delete'],
        'verify child duck contains creators from the parent duck'
    )
    t.end()
})

test('lets the child creators access the parent creators', (t) => {
    const d1 = new Duck({
        types: ['LOREM'],
        creators: () => ({
            get: () => ({d1: true})
        })
    })
    const d2 = d1.extend({
        types: ['IPSUM'],
        creators: (duck, parent) => ({
            get: () => ({...(parent || {get: () => true}).get(duck), d2: true})
        })
    })
    const d3 = d2.extend({
        types: ['DOLOR', 'SIT', 'AMET'],
        creators: (duck, parent) => ({
            get: () => ({...(parent || {get: () => true}).get(duck), d3: true})
        })
    })
    t.deepEqual(d3.creators.get(), {d1: true, d2: true, d3: true})
    t.end()
})

test('updates the old creators with the new properties', (t) => {
    const duck = new Duck({
        namespace: 'a',
        store: 'x',
        types: ['GET'],
        creators: ({types}) => ({
            get: () => ({type: types.GET})
        })
    })
    const childDuck = duck.extend({namespace: 'b', store: 'y'})
    t.deepEqual(childDuck.creators.get(), {type: 'b/y/GET'})
    t.end()
})
