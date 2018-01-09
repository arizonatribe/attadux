import test from 'tape'
import {createDuck, extendDuckWith} from '../src/Duck'

test('creates the constant objects', (t) => {
    const duck = createDuck({consts: {statuses: ['READY', 'ERROR']}})
    t.deepEqual(duck.consts.statuses, {READY: 'READY', ERROR: 'ERROR'})
    t.end()
})

test('creates constants whose key and value are NOT the same', (t) => {
    const duck = createDuck({consts: {BEST_JS_LIB: 'ramda', BEST_JS_FRAMEWORK: 'react'}})
    t.deepEqual(duck.consts, {BEST_JS_LIB: 'ramda', BEST_JS_FRAMEWORK: 'react'})
    t.end()
})

test('ignores constants whose values are objects', (t) => {
    const duck = createDuck({consts: {names: {BEST_JS_LIB: 'ramda', BEST_JS_FRAMEWORK: 'react'}}})
    t.equal(duck.consts.names, undefined)
    t.end()
})

test('creates constant whose value is a Date and cannot be overwritten', (t) => {
    const today = new Date()
    const duck = createDuck({consts: {today}})
    t.equal(duck.consts.today, today)
    t.end()
})

test('creates a constant whose value is a Regex', (t) => {
    const uppercase = new RegExp(/[A-Z]/)
    const duck = createDuck({consts: {uppercase}})
    t.equal(duck.consts.uppercase, uppercase)
    t.ok(duck.consts.uppercase.test('ABC'), 'A regex constant works')
    t.end()
})

test('creates a constant whose value is a string', (t) => {
    const duck = createDuck({consts: {name: 'David'}})
    t.equal(duck.consts.name, 'David')
    t.end()
})

test('creates a constant whose value is numeric', (t) => {
    const duck = createDuck({consts: {year: 2017}})
    t.equal(duck.consts.year, 2017)
    t.end()
})

test('creates a constant whose value is an array', (t) => {
    const duck = createDuck({consts: {frameworks: ['backbone', 'ember', 'angular', 'react', 'vue']}})
    t.deepEqual(duck.consts.frameworks, {
        backbone: 'backbone',
        ember: 'ember',
        angular: 'angular',
        react: 'react',
        vue: 'vue'
    })
    t.end()
})

test('converting an array of const values does not break when there are duplicates', (t) => {
    const duck = createDuck({consts: {frameworks: ['backbone', 'ember', 'angular', 'react', 'react', 'vue']}})
    t.deepEqual(duck.consts.frameworks, {
        backbone: 'backbone',
        ember: 'ember',
        angular: 'angular',
        react: 'react',
        vue: 'vue'
    })
    t.end()
})

test('cannot overwrite a constant', (t) => {
    const duck = createDuck({consts: {
        today: new Date(),
        name: 'David',
        year: 2017,
        frameworks: ['backbone', 'angular', 'ember', 'react', 'vue'],
        uppercase: new RegExp(/[A-Z]/)}
    })
    const changeRegexConst = () => {
        duck.consts.uppercase = new RegExp(/[a-z]/)
    }
    const changeStringConst = () => {
        duck.consts.name = 'your name'
    }
    const changeNumericConst = () => {
        duck.consts.year = 2000
    }
    const changeDateConst = () => {
        duck.consts.today = new Date('01/01/2000')
    }
    const changeArrayConst = () => {
        duck.consts.frameworks = ['vanilla']
    }
    t.throws(changeRegexConst, 'unable to overwrite a regex')
    t.throws(changeStringConst, 'unable to overwrite a string')
    t.throws(changeNumericConst, 'unable to overwrite a numeric value')
    t.throws(changeDateConst, 'unable to overwrite a Date value')
    t.throws(changeArrayConst, 'unable to overwrite an array')
    t.end()
})

test('extending the duck also copies the original consts', (t) => {
    const duck = createDuck({consts: {statuses: ['NEW']}})
    const childDuck = extendDuckWith(duck, {})
    t.deepEqual(childDuck.consts.statuses, {NEW: 'NEW'})
    t.end()
})

test('extending the duck merges new consts with those from the original duck', (t) => {
    const duck = createDuck({consts: {statuses: ['READY']}})
    const childDuck = extendDuckWith(duck, {consts: {statuses: ['FAILED']}})
    t.deepEqual(childDuck.consts.statuses, {READY: 'READY', FAILED: 'FAILED'})
    t.end()
})
