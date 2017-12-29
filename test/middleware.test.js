/* eslint "max-len": "off" */
import {compose, omit, identity} from 'ramda'
import test from 'tape'
import Duck from '../src/Duck'
import createMiddleware from '../src/middleware'
import {createRow} from '../src/helpers'
import {isStringieThingie} from '../src/is'
import {isOldEnough, isYoungEnough, isLongerThan, isShorterThan} from './util'

test('middleware:', (t) => {
    const namespace = 'attadux'
    const store = 'donald'
    const types = ['CREATE_USER', 'CLEAR', 'HERE', 'REWIND', 'FAST_FORWARD']
    const initialState = {user: {}}
    const machines = dux => ({
        tense: {
            initial: {
                [dux.types.HERE]: 'present'
            },
            past: {
                [dux.types.HERE]: 'present'
            },
            present: {
                [dux.types.REWIND]: 'past',
                [dux.types.FAST_FORWARD]: 'future'
            },
            future: {
                [dux.types.HERE]: 'present'
            }
        }
    })
    const reducer = (state, action, dux) => {
        switch (action.type) {
            case dux.types.CREATE_USER:
                return {...state, user: action.user}
            case dux.types.CLEAR:
                return {...dux.initialState}
            default:
                return state
        }
    }
    const validators = dux => ({
        [dux.types.CREATE_USER]: {
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
    })
    const creators = dux => ({
        clear: () => ({type: dux.types.CLEAR}),
        getUserDetails: user => ({user, type: dux.types.CREATE_USER})
    })

    const stuffing = {types, reducer, creators, namespace, initialState, validators, machines}
    const row = createRow(
        new Duck(omit('machines', {...stuffing, store})),
        new Duck({...stuffing, store: 'huey'}),
        new Duck({...stuffing, store: 'dewey'}),
        new Duck({...stuffing, store: 'louie'})
    )
    const middleware = createMiddleware(row)({getState: () => initialState})(identity)

    test('...after validating the paylod using a speific duck in the row append current state', (nt) => {
        const action = {type: `${namespace}/huey/CREATE_USER`, user: {age: 21, name: {first: 'huey', last: 'duck'}}}
        nt.deepEqual(
            middleware(action),
            {...action, states: {tense: 'initial'}},
            'verify that the action is validated by the appropriate duck'
        )
        nt.end()
    })
    test('...which can also be configured to cancel the reducer if validations on the payload fail', (nt) => {
        nt.equal(
            compose(row[store].reducer, middleware)({
                type: `${namespace}/${store}/CREATE_USER`,
                user: {age: 11, name: {first: 'H', last: 'Potter'}}
            }),
            false,
            'verify that reducer did not modify state, because the dispatched action\'s payload was invalid'
        )
        nt.end()
    })
    test('...but which pass the action when valid', (nt) => {
        const action = {
            type: `${namespace}/${store}/CREATE_USER`,
            user: {age: 14, name: {first: 'Harry', last: 'Potter'}}
        }
        nt.deepEqual(
            compose(row[store].reducer, middleware)(action),
            action,
            'verify that reducer was able to modify state, since the payload was deemed valid'
        )
        nt.end()
    })
    t.end()
})
