import test from 'tape'
import {createDuck, extendDuck} from '../src/duck'

test('lets the initialState reference the duck instance', (t) => {
    const duck = createDuck({
        consts: {statuses: ['NEW']},
        initialState: ({consts}) => ({status: consts.statuses.NEW})
    })
    t.deepEqual(duck.initialState, {status: 'NEW'})
    t.end()
})

test('accepts the initialState as an object', (t) => {
    const duck = createDuck({initialState: {obj: {}}})
    t.deepEqual(duck.initialState, {obj: {}})
    t.end()
})

test('passes the initialState to the original reducer when state is undefined', (t) => {
    const duck = createDuck({
        initialState: {obj: {}},
        reducer: (state) => state
    })
    t.deepEqual(duck.reducer(undefined, {type: duck.types.FETCH}), {obj: {}})
    t.end()
})

test('copies the initialState to the createDuck', (t) => {
    const duck = createDuck({initialState: {obj: null}})
    t.deepEqual(extendDuck(duck, {}).initialState, {obj: null})
    t.end()
})

test('passes the parent initialState to the child', (t) => {
    const parentDuck = createDuck({initialState: {parent: true}})
    const duck = extendDuck(parentDuck, {
        initialState: (_, parentState) => ({
            ...parentState,
            child: true
        })
    })
    t.deepEqual(duck.initialState, {parent: true, child: true})
    t.end()
})
