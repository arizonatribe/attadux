import test from 'tape'
import Duck from '../src/Duck'
import Selector from '../src/Selector'
import {createSelector} from '../src/helpers'

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

test('extending updates the old selectors with the new properties', (t) => {
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