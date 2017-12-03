import test from 'tape'
import Duck from '../src/Duck'

test('transforms types in object with prefix', (t) => {
    t.deepEqual(
        new Duck({
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
    const duck = new Duck({
        namespace: 'ns',
        store: 'x',
        types: ['FETCH']
    })
    t.deepEqual(
        duck.extend({namespace: 'ns2', store: 'y'}).types,
        {FETCH: 'ns2/y/FETCH'},
        'verify the extended duck FETCH overwrites the parent FETCH with the child\'s namespace inside its new value'
    )
    t.end()
})

test('extending also appends any new types', (t) => {
    t.deepEqual(
        new Duck({
            namespace: 'ns1',
            store: 'x',
            types: ['START']
        }).extend({
            namespace: 'ns2',
            store: 'y',
            types: ['RESET']
        }).types,
        {RESET: 'ns2/y/RESET', START: 'ns2/y/START'},
        'type RESET from the child is appended when the duck is extended'
    )
    t.end()
})
