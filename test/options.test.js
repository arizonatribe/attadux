import test from 'tape'
import Duck, {duxDefaults} from '../src/Duck'

test('default values for all options have not changed', (t) => {
    t.deepEqual(
        {
            consts: {},
            creators: {},
            machines: {},
            selectors: {},
            types: [],
            validators: {}
        },
        duxDefaults,
        'verify the defaults for several Duck options are empty objects and arrays'
    )
    t.end()
})

test('options object from the parent is accessible to the child (extended) duck', (t) => {
    const duck = new Duck({foo: 2})
    const childDuck = duck.extend({
        initialState: ({options}) => ({
            bar: options.foo * 2
        })
    })
    t.equal(
        childDuck.initialState.bar,
        4,
        'the child\'s initialState had access to the parent\'s options to create a value for \'bar\''
    )
    t.end()
})

test('the parent duck instance can be used when options passed into extend() is a function', (t) => {
    const duck = new Duck({foo: 2})
    const childDuck = duck.extend(parent => ({
        bar: parent.options.foo * 2
    }))
    t.equal(
        childDuck.options.bar,
        4,
        'the child options \'bar\' prop was set using the parent \'foo\' prop'
    )
    t.end()
})
