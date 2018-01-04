/* eslint "max-len": "off" */
import {always, compose, omit, identity} from 'ramda'
import test from 'tape'
import Duck from '../src/Duck'
import createMiddleware from '../src/middleware'
import {createRow} from '../src/helpers/duck'
import {isStringieThingie} from '../src/helpers/is'
import {isOldEnough, isYoungEnough, isLongerThan, isShorterThan} from './util'

test('middleware:', (ot) => {
    const namespace = 'attadux'
    const store = 'donald'
    const types = ['CREATE_USER', 'CLEAR', 'HERE', 'REWIND', 'FAST_FORWARD', 'FREEZE']
    const initialState = {user: {}}
    const machines = dux => ({
        tense: {
            initial: {
                [dux.types.FREEZE]: 'limbo',
                [dux.types.HERE]: 'present'
            },
            past: {
                [dux.types.FREEZE]: 'limbo',
                [dux.types.HERE]: 'present'
            },
            present: {
                [dux.types.FREEZE]: 'limbo',
                [dux.types.REWIND]: 'past',
                [dux.types.FAST_FORWARD]: 'future'
            },
            future: {
                [dux.types.FREEZE]: 'limbo',
                [dux.types.HERE]: 'present'
            },
            limbo: {}
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

    const stuffing = {types, reducer, store, creators, namespace, initialState, validators, machines}
    const row = createRow(
        new Duck(stuffing),
        new Duck({...stuffing, store: 'huey'}),
        new Duck({...stuffing, store: 'dewey'}),
        new Duck({...stuffing, store: 'louie'}),
        new Duck({...omit('machines', stuffing), store: 'scrooge'})
    )
    const middleware = createMiddleware(row)({getState: always(initialState)})(identity)
    const middlewareThenReducer = (duckName = store, muddleware = middleware, state) =>
        compose(
            a => row[duckName].reducer(state || row[duckName].initialState, a, row[duckName]),
            muddleware
        )

    test('...wont\'t move to an invalid state despite a dispatched action that tries it to move to that state', (t) => {
        t.deepEqual(
            middlewareThenReducer()({
                type: `${namespace}/${store}/CREATE_USER`,
                user: {id: 123, name: {first: 'David'}}
            }),
            {...initialState, states: {tense: 'initial'}, user: {id: 123, name: {first: 'David'}}},
            'state cannot change to \'loggedIn\' from \'initial\', but must transition to \'inProgress\' and wait there'
        )
        t.end()
    })

    test('...whose machines can be extended', (t) => {
        const presentState = {user: {}, states: {tense: 'present'}}
        const childDuck = row[store].extend({
            types: ['ED'],
            machines: {
                tense: {
                    present: {[`${namespace}/${store}/ED`]: 'pastPerfect'},
                    pastPerfect: {[`${namespace}/${store}/HERE`]: 'present'}
                }
            },
            reducer: (state, action, dux) => {
                switch (action.type) {
                    case dux.types.ED:
                        return dux.initialState
                    default:
                        return state
                }
            }
        })
        const mdlware = createMiddleware({[store]: childDuck})({getState: always(presentState)})(identity)

        t.deepEqual(childDuck.machines.tense.present, {
            [`${namespace}/${store}/FREEZE`]: 'limbo',
            [`${namespace}/${store}/REWIND`]: 'past',
            [`${namespace}/${store}/ED`]: 'pastPerfect',
            [`${namespace}/${store}/FAST_FORWARD`]: 'future'
        }, 'verify the child duck shows the added input type of \'ED\' on the \'pastPerfect\' state')
        t.deepEqual(
            compose(
                a => childDuck.reducer(presentState, a),
                mdlware
            )({type: `${namespace}/${store}/ED`}),
            {...initialState, states: {tense: 'pastPerfect'}},
            'state has changed from \'present\' to \'pastPerfect\' when external ED event occurred'
        )
        t.end()
    })

    test('...can move to a VALID state when the approprate action is dispatched', (t) => {
        t.deepEqual(
            middlewareThenReducer()({type: `${namespace}/${store}/HERE`}),
            {...initialState, states: {tense: 'present'}},
            'state has changed from \'initial\' to \'present\''
        )
        t.end()
    })

    test('...tracks the machine states in the redux store', (t) => {
        t.deepEqual(
            row[store].initialState.states,
            {tense: 'initial'},
            'initial state should include \'states\' even if not set up by the user'
        )
        t.deepEqual(
            middlewareThenReducer()({type: `${namespace}/${store}/HERE`}),
            {...initialState, states: {tense: 'present'}},
            'the \'states\' prop from the redux store properly reflects the change from \'initial\' to \'present\''
        )

        t.end()
    })

    test('...can move to a permanent state when desired', (t) => {
        t.deepEqual(
            middlewareThenReducer()({type: `${namespace}/${store}/FREEZE`}),
            {...initialState, states: {tense: 'limbo'}},
            'gracefully confirms the current state has no possible transitions'
        )
        t.end()
    })

    test('...allows custom prop name for tracking machine states in the redux store', (t) => {
        const iniState = {user: {}, authStates: {tense: 'initial'}}
        const duck = new Duck({
            stateMachinesPropName: 'authStates',
            namespace,
            store,
            types,
            machines,
            validators,
            initialState,
            reducer
        })
        const mdlware = createMiddleware({[store]: duck})({getState: always(iniState)})(identity)

        t.deepEqual(
            duck.initialState.authStates,
            {tense: 'initial'},
            'initial state should include \'authStates\' even if not set up by the user'
        )
        t.deepEqual(
            compose(
                a => duck.reducer(iniState, a),
                mdlware
            )({type: `${namespace}/${store}/HERE`}),
            {...iniState, authStates: {tense: 'present'}},
            'the \'authStates\' prop from the redux store properly reflects the change from \'initial\' to \'present\''
        )
        t.end()
    })

    test('...allows even custom prop names (for tracking machine states) that are nested paths (dot separated)', (t) => {
        const futureState = {user: {}, future: {pluperative: {tense: 'future'}}}
        const duck = new Duck({
            stateMachinesPropName: 'future.pluperative',
            namespace,
            store,
            types,
            machines,
            validators,
            initialState,
            reducer
        })
        const mdlware = createMiddleware({[store]: duck})({getState: always(futureState)})(identity)

        t.deepEqual(
            duck.initialState.future.pluperative,
            {tense: 'initial'},
            'initial state should include nested object path \'{future: {pluperative: {}}\' even if not set up by the user'
        )
        t.deepEqual(
            compose(
                a => duck.reducer(futureState, a),
                mdlware
            )({type: `${namespace}/${store}/HERE`}),
            {...futureState, future: {pluperative: {tense: 'present'}}},
            'the \'{future: {pluperative: { }}\' prop from the redux store properly reflects the change from \'future\' to \'present\''
        )

        t.end()
    })

    test('...allows custom prop names (for tracking machine states) that are an  array of string paths', (t) => {
        const pastState = {user: {}, future: {pluperative: {tense: 'past'}}}
        const duck = new Duck({
            stateMachinesPropName: ['future', 'pluperative'],
            namespace,
            store,
            types,
            machines,
            validators,
            initialState,
            reducer
        })
        const mdlware = createMiddleware({[store]: duck})({getState: always(pastState)})(identity)

        t.deepEqual(
            duck.initialState.future.pluperative,
            {tense: 'initial'},
            'initial state should include nested object path \'{future: {pluperative: {}}\' even if not set up by the user'
        )
        t.deepEqual(
            compose(
                a => duck.reducer(pastState, a),
                mdlware
            )({type: `${namespace}/${store}/HERE`}),
            {...pastState, future: {pluperative: {tense: 'present'}}},
            'the \'{future: {pluperative: { }}\' prop from the redux store properly reflects the change from \'past\' to \'present\''
        )

        t.end()
    })

    test('...validates nested prop paths which are invalid and ensures machine states are still tracked in the store', (t) => {
        const duck = new Duck({
            stateMachinesPropName: [{}, [], null],
            namespace,
            store,
            types,
            machines,
            validators,
            initialState,
            reducer
        })
        const mdlware = createMiddleware({[store]: duck})({getState: always(duck.initialState)})(identity)

        t.deepEqual(
            duck.initialState,
            {...initialState, states: {tense: 'initial'}},
            'initial state should fall back to \'states\' as the path to track current state'
        )
        t.deepEqual(
            compose(
                a => duck.reducer(duck.initialState, a),
                mdlware
            )({type: `${namespace}/${store}/HERE`}),
            {...initialState, states: {tense: 'present'}},
            'the \'states\' prop from the redux store properly reflects the change from \'initial\' to \'present\''
        )

        t.end()
    })

    test('...wont\'t move to an invalid state or invoke the reducer when in strict mode', (t) => {
        const duck = new Duck({
            namespace,
            store,
            types,
            machines,
            initialState,
            reducer,
            validators,
            validationLevel: 'STRICT'
        })
        const mdlware = createMiddleware({[store]: duck})({getState: () => initialState})(identity)

        t.deepEqual(
            mdlware({
                type: `${namespace}/${store}/CREATE_USER`,
                user: {id: 123, name: {first: 'David'}}
            }),
            false,
            'verify the state did NOT change from \'initial\' to \'present\' and the reducer is canceled'
        )
        t.end()
    })

    test('...will prune invalid fields when in prune mode', (t) => {
        const duck = new Duck({
            namespace,
            store,
            types,
            machines,
            initialState,
            reducer,
            validators,
            validationLevel: 'PRUNE'
        })
        const mdlware = createMiddleware({[store]: duck})({getState: () => initialState})(identity)

        t.deepEqual(
            mdlware({
                type: `${namespace}/${store}/CREATE_USER`,
                user: {id: 123, name: {first: 'D'}}
            }),
            {type: `${namespace}/${store}/CREATE_USER`, user: {id: 123}},
            'verify the invalid first name field was pruned from the action payload'
        )
        t.end()
    })

    test('...after validating the paylod using a speific duck in the row append current state', (t) => {
        const user = {age: 21, name: {first: 'huey', last: 'duck'}}
        
        t.deepEqual(
            middlewareThenReducer('huey')({
                type: `${namespace}/huey/CREATE_USER`, user
            }),
            {user, states: {tense: 'initial'}},
            'verify that the action is validated by the appropriate duck'
        )
        t.end()
    })

    test('...which can also be configured to cancel the reducer if validations on the payload fail', (t) => {
        t.equal(
            middleware({
                type: `${namespace}/${store}/CREATE_USER`,
                user: {age: 11, name: {first: 'H', last: 'Potter'}}
            }),
            false,
            'verify that reducer did not modify state, because the dispatched action\'s payload was invalid'
        )
        t.end()
    })

    test('...but which pass the action when valid', (t) => {
        const action = {
            type: `${namespace}/scrooge/CREATE_USER`,
            user: {age: 14, name: {first: 'Harry', last: 'Potter'}}
        }
        t.deepEqual(
            middleware(action),
            action,
            'verify that reducer was able to modify state, since the payload was deemed valid'
        )
        t.end()
    })

    ot.end()
})
