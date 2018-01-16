import test from 'tape'
import {createDuck, extendDuck} from '../src/duck'

test('transforms types in object with prefix', (t) => {
    t.deepEqual(
        createDuck({
            namespace: 'app',
            store: 'users',
            types: ['FETCH']
        }).types,
        {FETCH: 'app/users/FETCH'},
        'verify the types have been transformed from array of types (strings) to object whose values are now namespaced'
    )
    t.end()
})

test('extending overrides the types', (t) => {
    const duck = createDuck({
        namespace: 'ns',
        store: 'x',
        types: ['FETCH']
    })
    const childDuck = extendDuck(duck, {namespace: 'ns2', store: 'y'})
    t.deepEqual(
        childDuck.types,
        {FETCH: 'ns2/y/FETCH'},
        'verify the extended duck FETCH overwrites the parent FETCH with the child\'s namespace inside its new value'
    )
    t.end()
})

test('extending also appends any new types', (t) => {
    t.deepEqual(
        extendDuck(createDuck({
            namespace: 'ns1',
            store: 'x',
            types: ['START']
        }), {
            namespace: 'ns2',
            store: 'y',
            types: ['RESET']
        }).types,
        {RESET: 'ns2/y/RESET', START: 'ns2/y/START'},
        'type RESET from the child is appended when the duck is extended'
    )
    t.end()
})
