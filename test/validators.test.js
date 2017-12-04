/* eslint "max-len": "off" */
import test from 'tape'
import {is, length} from 'ramda'
import Duck from '../src/Duck'
import {isStringieThingie} from '../src/is'

test('validators:', (t) => {
    const isString = is(String)
    const isNumber = is(Number)
    const isOldEnough = val => isNumber(val) && val > 12
    const isYoungEnough = val => isNumber(val) && val < 112
    const isValidEmail = s => /[^\\.\\s@:][^\\s@:]*(?!\\.)@[^\\.\\s@]+(?:\\.[^\\.\\s@]+)*/.test(s)
    const isLongerThan = len => isNumber(len) && len > 0 && (str => isString(str) && length(str) > len)
    const isShorterThan = len => isNumber(len) && len > 0 && (str => isString(str) && length(str) < len)

    const initialState = {
        email: '',
        user: {}
    }
    const validators = {
        auth: {
            email: [
                [isStringieThingie, 'Email is required'],
                [isValidEmail, 'Invalid format for email address']
            ],
            user: {
                name: {
                    first: [
                        [isStringieThingie, 'First name is required'],
                        [isLongerThan(2), 'Come on now; be serious. What\'s your REAL name?'],
                        [isShorterThan(200), 'Your name is too long; have you considered a nickname?']
                    ],
                    last: [
                        [isStringieThingie, 'Last name is required'],
                        [isLongerThan(2), 'Your last name is too short; ask your parents for more letters'],
                        [isShorterThan(200), 'Your last name is too long; English speakers are lazy and give up pronouncing words with more than five syllables']
                    ]
                },
                age: [
                    [isOldEnough, 'You are too young; please go get your parents'],
                    [isYoungEnough, 'Impressive that you can operate a computer without punch-cards, but seriously you are way too old']
                ]
            }
        }
    }

    test('...deeply nested validators', (nt) => {
        const duck = new Duck({namespace: 'attadux', store: 'auth', initialState, validators})
        nt.deepEqual(
            duck.validators.auth({email: 'lorem.ipsum@email.com', user: {age: 22, name: {first: 'John', last: 'Smith'}}}),
            {email: true, user: {age: true, name: {first: true, last: true}}},
            ''
        )
        nt.end()
    })

    test('...extending validators', (nt) => {
        const duck = new Duck({namespace: 'attadux', store: 'auth', initialState, validators})
        nt.deepEqual(
            duck.extend({
                validators: {
                    auth: {
                        email: [[val => /mycompany\.com$/.test(val), 'Only mycompany.com email addresses allowed']]
                    }
                }
            }).validators.auth({
                email: 'lorem.ipsum@email.org',
                user: {age: 22, name: {first: 'John', last: 'Smith'}}
            }),
            {email: ['Only mycompany.com email addresses allowed'], user: {age: true, name: {first: true, last: true}}},
            ''
        )
        nt.end()
    })

    t.end()
})

// run validators =>

// run reducer and intercept modified state =>

// use validation result to build version of prior state with only fields which failed validation (value should be original) =>

// deep merge the modified state with the version of prior state where validations failed
