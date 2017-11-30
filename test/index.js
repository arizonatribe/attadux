import test from 'tape'
import Duck, {duxDefaults} from '../src/Duck'
import Selector from '../src/Selector'
import {createSelector} from '../src/helpers'

test('default values for all options have not changed', (t) => {
    t.deepEqual({
            consts: {},
            creators: {},
            machines: {},
            selectors: {},
            types: [],
            validators: {}
        },
        duxDefaults
    )
    t.end()
})

test('transforms types in object with prefix', (t) => {
    t.deepEqual(
        new Duck({
            namespace: 'app',
            store: 'users',
            types: ['FETCH']
        }).types,
        {FETCH: 'app/users/FETCH'}
    )
    t.end()
})

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

test('lets the selectors compose themselves and reference the duck instance', (t) => {
    const duck = new Duck({
        initialState: {
            items: [
                {name: 'apple', value: 1.2},
                {name: 'orange', value: 0.95}
            ]
        },
        selectors: {
            items: state => state.items, // gets the items from complete state
            subTotal: new Selector(selectors => state =>
                // Get another derived state reusing previous items selector.
                // Can be composed multiple such states if using library like reselect.
                selectors.items(state).reduce((computedTotal, item) => computedTotal + item.value, 0)
            )
        }
    })
    t.deepEqual(
        duck.selectors.items(duck.initialState),
        [
            {name: 'apple', value: 1.2},
            {name: 'orange', value: 0.95}
        ]
    )
    t.equal(duck.selectors.subTotal(duck.initialState), 2.15)
    t.end()
})

test('generates the selector function once per selector', (t) => {
    let numOfSelectors = 0
    const duck = new Duck({
        selectors: {
            myFunc: new Selector(() => {
              numOfSelectors++
              return () => {}
            })
        }
    })
    duck.selectors.myFunc()
    duck.selectors.myFunc()
    t.equal(numOfSelectors, 1)
    t.end()
})

test('works with reselect', (t) => {
    const duck = new Duck({
        selectors: {
          test1: state => state.test1,
          test2: new Selector(selectors => createSelector(
            selectors.test1,
            test1 => test1
          )),
          test3: new Selector(selectors => createSelector(
            selectors.test2,
            test2 => test2
          ))
        }
    })
    t.equal(duck.selectors.test3({test1: 'it works'}), 'it works')
    t.end()
})

test('lets the initialState reference the duck instance', (t) => {
    const duck = new Duck({
        consts: {statuses: ['NEW']},
        initialState: ({consts}) => ({status: consts.statuses.NEW})
    })
    t.deepEqual(duck.initialState, {status: 'NEW'})
    t.end()
})

test('accepts the initialState as an object', (t) => {
    const duck = new Duck({initialState: {obj: {}}})
    t.deepEqual(duck.initialState, {obj: {}})
    t.end()
})

test('creates the constant objects', (t) => {
    const duck = new Duck({consts: {statuses: ['READY', 'ERROR']}})
    t.deepEqual(duck.consts.statuses, {READY: 'READY', ERROR: 'ERROR'})
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

test('lets the original reducer reference the duck instance', (t) => {
    const duck = new Duck({
        types: ['FETCH'],
        reducer: (state, action, { types }) => {
            switch (action.type) {
                case types.FETCH:
                    return {worked: true}
                default:
                    return state
            }
        }
    })
    t.deepEqual(duck.reducer({}, { type: duck.types.FETCH }), {worked: true})
    t.end()
})

test('passes the initialState to the original reducer when state is undefined', (t) => {
    const duck = new Duck({
        initialState: {obj: {}},
        reducer: (state) => state
    })
    t.deepEqual(duck.reducer(undefined, {type: duck.types.FETCH}), {obj: {}})
    t.end()
})

test('creates a new Duck', (t) => {
    t.deepEqual(new Duck({}).extend({}).constructor.name, 'Duck')
    t.end()
})

test('copies the attributes to the new Duck', (t) => {
    const duck = new Duck({initialState: {obj: null}})
    t.deepEqual(duck.extend({}).initialState, {obj: null})
    t.end()
})

test('copies the original consts', (t) => {
    const duck = new Duck({consts: {statuses: ['NEW']}})
    t.deepEqual(duck.extend({}).consts.statuses, {NEW: 'NEW'})
    t.end()
})

test('overrides the types', (t) => {
    const duck = new Duck({
        namespace: 'ns',
        store: 'x',
        types: ['FETCH']
    })
    t.deepEqual(duck.extend({namespace: 'ns2', store: 'y'}).types, {FETCH: 'ns2/y/FETCH'})
    t.end()
})

test('merges the consts', (t) => {
    const duck = new Duck({consts: {statuses: ['READY']}})
    t.deepEqual(
        duck.extend({consts: {statuses: ['FAILED']}}).consts.statuses,
        {READY: 'READY', FAILED: 'FAILED'}
    )
    t.end()
})

test('appends new types', (t) => {
    t.deepEqual(
        new Duck({}).extend({
          namespace: 'ns2',
          store: 'y',
          types: ['RESET']
        }).types,
        {RESET: 'ns2/y/RESET'}
    )
    t.end()
})

test('appends the new reducers', (t) => {
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
    t.deepEqual(Object.keys(childDuck.creators), ['get', 'delete'])
    t.end()
})

test('lets the reducers access the parents', (t) => {
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

test('passes the duck instance as argument', (t) => {
    const duck = new Duck({foo: 2})
    const childDuck = duck.extend(parent => ({
        bar: parent.options.foo * 2
    }))
    t.equal(childDuck.options.bar, 4)
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

test('updates the old selectors with the new properties', (t) => {
    const duck = new Duck({
        namespace: 'a',
        store: 'x',
        initialState: {
            items: [
                {name: 'apple', value: 1.2},
                {name: 'orange', value: 0.95}
            ]
        },
        selectors: {
            items: state => state.items // gets the items from complete state
        }
    })
    const childDuck = duck.extend({
        namespace: 'b',
        store: 'y',
        selectors: {
            subTotal: new Selector(selectors => state =>
                // Get another derived state reusing previous items selector.
                // Can be composed multiple such states if using library like reselect.
                selectors.items(state).reduce((computedTotal, item) => computedTotal + item.value, 0)
            )
        }
    })
    t.deepEqual(
        childDuck.selectors.items(duck.initialState),
        [
            {name: 'apple', value: 1.2},
            {name: 'orange', value: 0.95}
        ]
    )
    t.equal(childDuck.selectors.subTotal(duck.initialState), 2.15)
    t.end()
})

test('adds the new reducer keeping the old ones', (t) => {
    const parentDuck = new Duck({
        reducer: (state, action) => {
            switch (action.type) {
                case 'FETCH':
                    return {...state, parentDuck: true}
                default:
                  return state
            }
        }
    })
    const duck = parentDuck.extend({
        reducer: (state, action) => {
            switch (action.type) {
                case 'FETCH':
                    return {...state, duck: true}
                default:
                    return state
            }
        }
    })
    t.deepEqual(duck.reducer({}, {type: 'FETCH'}), {parentDuck: true, duck: true})
    t.end()
})

test('does not affect the original duck', (t) => {
    const parentDuck = new Duck({
        reducer: (state, action) => {
            switch (action.type) {
                case 'FETCH':
                    return {...state, parentDuck: true}
                default:
                    return state
            }
        }
    })
    parentDuck.extend({
        reducer: (state, action) => {
            switch (action.type) {
                case 'FETCH':
                    return {...state, duck: true}
                default:
                    return state
            }
        }
    })
    t.deepEqual(parentDuck.reducer({}, {type: 'FETCH'}), {parentDuck: true})
    t.end()
})

test('passes the parent initialState to the child', (t) => {
    const parentDuck = new Duck({initialState: {parent: true}})
    const duck = parentDuck.extend({
        initialState: (_, parentState) => ({
            ...parentState,
            child: true
        })
    })
    t.deepEqual(duck.initialState, {parent: true, child: true})
    t.end()
})
