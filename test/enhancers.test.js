import test from 'tape'
import {
    concat,
    converge,
    divide,
    join,
    length,
    pick,
    pipe,
    prop,
    toUpper,
    values
} from 'ramda'
import {createDuck, extendDuck} from '../src/duck'

test('basics of action enhancers', (t) => {
    const now = new Date()
    const duck = createDuck({
        consts: {
            baseUrl: 'http://localhost/api/'
        },
        types: ['SCREAM', 'CLUTTER', 'ENDPOINT', 'FORMAT', 'NAME'],
        enhancers: ({types, consts}) => ({
            [types.SCREAM]: {
                name: toUpper
            },
            [types.CLUTTER]: {
                trunk: 'junk',
                then: now
            },
            [types.ENDPOINT]: {
                url: pipe(prop('endpoint'), concat(consts.baseUrl))
            },
            [types.FORMAT]: {
                shapeyMode: 'strict',
                type: types.NAME,
                name: pipe(pick(['firstName', 'lastName']), values, join(' '))
            }
        })
    })
    t.deepEqual(
        duck.enhancers[duck.types.SCREAM]({
            type: duck.types.SCREAM,
            name: 'Jim'
        }),
        {type: duck.types.SCREAM, name: 'JIM'},
        'the enhancers can reference the types on the duck instance'
    )
    t.deepEqual(
        duck.enhancers[duck.types.CLUTTER]({
            type: duck.types.CLUTTER,
            name: 'Jim'
        }),
        {type: duck.types.CLUTTER, name: 'Jim', trunk: 'junk', then: now},
        'enhancer props which are not functions are passed through as-is'
    )
    t.deepEqual(
        duck.enhancers[duck.types.ENDPOINT]({
            type: duck.types.ENDPOINT,
            endpoint: 'users'
        }),
        {type: duck.types.ENDPOINT, url: 'http://localhost/api/users', endpoint: 'users'},
        'can use the consts in the enhancers'
    )
    t.deepEqual(
        duck.enhancers[duck.types.ENDPOINT]({
            type: duck.types.ENDPOINT,
            endpoint: 'users'
        }),
        {type: duck.types.ENDPOINT, url: 'http://localhost/api/users', endpoint: 'users'},
        'can use the consts in the enhancers'
    )
    t.deepEqual(
        duck.enhancers[duck.types.FORMAT]({
            type: duck.types.FORMAT,
            firstName: 'Lorem',
            lastName: 'Ipsum',
            age: 2000,
            language: 'LATIN'
        }),
        {type: duck.types.NAME, name: 'Lorem Ipsum'},
        'if you use a strict shaping function, only the fields from the spec are included'
    )
    t.end()
})

test('lets the enhancers access the selectors', (t) => {
    const duck = createDuck({
        types: ['SUM'],
        selectors: {
            sum: numbers => numbers.reduce((sum, n) => sum + n, 0)
        },
        enhancers: ({types, selectors}) => ({
            [types.SUM]: {
                numbers: selectors.sum
            }
        })
    })

    t.deepEqual(
        duck.enhancers[duck.types.SUM]({
            type: duck.types.SUM,
            numbers: [1, 2, 3]
        }),
        {type: duck.types.SUM, numbers: 6},
        'enhancers can use the selectors'
    )
    t.end()
})

test('enhancers merge onto existing action body', (t) => {
    const duck = createDuck({
        types: ['SUM'],
        selectors: {
            sum: numbers => numbers.reduce((sum, n) => sum + n, 0)
        },
        enhancers: ({types, selectors}) => ({
            [types.SUM]: {
                sum: pipe(prop('numbers'), selectors.sum)
            }
        })
    })
    t.deepEqual(
        duck.enhancers[duck.types.SUM]({
            type: duck.types.SUM,
            numbers: [1, 2, 3]
        }),
        {type: duck.types.SUM, numbers: [1, 2, 3], sum: 6},
        'can create a new prop from existing ones'
    )
    t.end()
})

test('extending merges new enhancers with those from the original duck', (t) => {
    const duck = createDuck({
        namespace: 'a',
        store: 'x',
        types: ['SUM'],
        selectors: {
            sum: numbers => numbers.reduce((sum, n) => sum + n, 0)
        },
        enhancers: ({types, selectors}) => ({
            [types.SUM]: {
                sum: pipe(prop('numbers'), selectors.sum)
            }
        })
    })
    const childDuck = extendDuck(duck, {
        types: ['AVERAGE'],
        enhancers: ({types, selectors}) => ({
            [types.AVERAGE]: {
                avg: pipe(prop('numbers'), converge(divide, [selectors.sum, length]))
            }
        })
    })
    t.deepEqual(
        Object.keys(childDuck.enhancers),
        [duck.types.SUM, childDuck.types.AVERAGE],
        'verify child duck contains enhancers from the parent duck'
    )
    t.deepEqual(
        childDuck.enhancers[childDuck.types.AVERAGE]({
            type: childDuck.types.AVERAGE,
            numbers: [1, 2, 3]
        }),
        {type: childDuck.types.AVERAGE, numbers: [1, 2, 3], avg: 2},
        'using the child enhancer'
    )
    t.deepEqual(
        childDuck.enhancers[childDuck.types.SUM]({
            type: duck.types.SUM,
            numbers: [1, 2, 3]
        }),
        {type: duck.types.SUM, numbers: [1, 2, 3], sum: 6},
        'can access the parent enhancers'
    )
    t.end()
})

test('enhancers can also be arrays of tranform functions', (t) => {
    const duck = createDuck({
        types: ['AVERAGE'],
        creators: ({types}) => ({
            computeAverage: (numbers = []) => ({numbers, type: types.AVERAGE})
        }),
        selectors: {
            count: numbers => numbers.length,
            sum: numbers => numbers.reduce((tot, num) => tot + num, 0),
            average: (count, total) => (total / (count || 1))
        },
        enhancers: ({types, selectors}) => ({
            [types.AVERAGE]: [
                {count: pipe(prop('numbers'), selectors.count)},
                {sum: pipe(prop('numbers'), selectors.sum)},
                {average: converge(selectors.average, [prop('count'), prop('sum')])}
            ]
        })
    })
    const action = duck.creators.computeAverage([1, 4, 3, 7, 38, 2, 39, 27, 17, 104])
    t.equal(typeof duck.enhancers[action.type], 'function', 'there is an enhancer whose name matches the action type')
    t.deepEqual(
        duck.enhancers[action.type](action), {
            type: duck.types.AVERAGE,
            sum: 242,
            count: 10,
            numbers: [1, 4, 3, 7, 38, 2, 39, 27, 17, 104],
            average: 24.2
        }
    )
    t.end()
})

// test('enhancers can also be a single function', (t) => {
// test('enhancers with arrays of tranform functions are executed in order')
