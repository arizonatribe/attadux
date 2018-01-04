/* eslint "max-len": "off" */
import test from 'tape'
import Duck from '../src/Duck'
import {isStringieThingie} from '../src/helpers/is'
import {isOldEnough, isYoungEnough, isValidEmail, isLongerThan, isShorterThan} from './util'
import VALIDATION_LEVELS from '../src/validators/levels'

test('VALIDATION_LEVELS', (t) => {
    t.deepEqual(
        Object.keys(VALIDATION_LEVELS),
        ['STRICT', 'CANCEL', 'PRUNE', 'LOG'],
        'verify the strict, cancel, prune and log modes have not been renamed (would be a breaking change to the api)'
    )
    t.end()
})

test('validators:', (t) => {
    const namespace = 'attadux'
    const store = 'auth'
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

    test('...which can be deeply nested', (nt) => {
        const duck = new Duck({namespace, store, initialState, validators})
        nt.deepEqual(
            duck.validators.auth({email: 'lorem.ipsum@email.com', user: {age: 22, name: {first: 'John', last: 'Smith'}}}),
            {email: true, user: {age: true, name: {first: true, last: true}}},
            'verify that all the input fields passed validation'
        )
        nt.end()
    })

    test('...which always pass true for input props that have no corresponding validation rule', (nt) => {
        const duck = new Duck({namespace, store, initialState, validators})
        nt.deepEqual(
            duck.validators.auth({email: 'lorem.ipsum@email.com', lorem: 'ipsum', dolor: 'sit amet'}),
            {email: true, lorem: true, dolor: true},
            'verify that the valid \'email\' field and the other fields (which have no validators) are all true'
        )
        nt.end()
    })

    test('...which can be extended', (nt) => {
        const duck = new Duck({namespace, store, initialState, validators})
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
            'verify the email domain-specific extended rule catches the invalid domain'
        )
        nt.end()
    })

    test('...which can also provide manual checking of action payload to the reducer', (nt) => {
        const duck = new Duck({
            namespace,
            store,
            initialState,
            types: ['CREATE_USER'],
            validators: {
                [`${namespace}/${store}/CREATE_USER`]: {user: validators.auth.user}
            },
            reducer(state, action, {types, isPayloadValid}) {
                switch (action.type) {
                    case types.CREATE_USER: {
                        if (isPayloadValid(action)) {
                            return {...state, user: action.user}
                        }
                    }
                    // no default
                }
                return state
            }
        })
        nt.deepEqual(
            duck.reducer(initialState, {
                type: `${namespace}/${store}/CREATE_USER`,
                user: {age: 11, name: {first: 'H', last: 'Potter'}}
            }),
            initialState,
            'verify that reducer did not modify state, because the dispatched action\'s payload was invalid'
        )
        nt.end()
    })

    t.end()
})
