/* eslint "max-len": "off" */
import test from 'tape'
import Duck from '../src/Duck'

test('state machines:', (t) => {
    const namespace = 'attadux'
    const store = 'auth'
    const initialState = {
        baseUrl: 'http://localhost',
        user: {}
    }
    const types = [
        'ATTEMPT_LOGIN',
        'ATTEMPT_LOGOUT',
        'CLEAR_ERROR',
        'LOGIN_SUCCESSFUL',
        'LOGIN_ERROR',
        'LOGOUT_SUCCESSFUL',
        'LOGOUT_ERROR'
    ]
    const reducer = (state, action, dux) => {
        switch (action.type) {
            case dux.types.LOGOUT_ERROR:
            case dux.types.LOGIN_ERROR:
                return {...state, error: action.error}
            case dux.types.LOGIN_SUCCESSFUL:
                return {...state, user: action.user}
            case dux.types.LOGOUT_SUCCESSFUL:
                return initialState
            default:
                return state
        }
    }
    const manualReducer = (state, action, dux) => {
        switch (action.type) {
            case dux.types.ATTEMPT_LOGOUT:
            case dux.types.ATTEMPT_LOGIN:
                return {
                    ...state,
                    states: {
                        ...state.states,
                        auth: dux.getNextStateForMachine('auth')(state, action)
                    }
                }
            case dux.types.LOGOUT_ERROR:
            case dux.types.LOGIN_ERROR:
                return {
                    ...state,
                    error: action.error,
                    states: {
                        ...state.states,
                        auth: dux.getNextStateForMachine('auth')(state, action)
                    }
                }
            case dux.types.LOGIN_SUCCESSFUL:
                return {
                    ...state,
                    user: action.user,
                    states: {
                        ...state.states,
                        auth: dux.getNextStateForMachine('auth')(state, action)
                    }
                }
            case dux.types.LOGOUT_SUCCESSFUL:
                return {
                    ...dux.initialState,
                    states: {
                        auth: dux.getNextStateForMachine('auth')(state, action)
                    }
                }
            default:
                return state
        }
    }
    const auth = {
        initial: {
            [`${namespace}/${store}/ATTEMPT_LOGIN`]: 'inProgress'
        },
        inProgress: {
            [`${namespace}/${store}/LOGIN_ERROR`]: 'error',
            [`${namespace}/${store}/LOGOUT_ERROR`]: 'error',
            [`${namespace}/${store}/LOGIN_SUCCESSFUL`]: 'loggedIn',
            [`${namespace}/${store}/LOGOUT_SUCCESSFUL`]: 'loggedOut'
        },
        loggedIn: {
            [`${namespace}/${store}/ATTEMPT_LOGOUT`]: 'inProgress'
        },
        loggedOut: {
            [`${namespace}/${store}/ATTEMPT_LOGIN`]: 'inProgress'
        },
        error: {
            [`${namespace}/${store}/ATTEMPT_LOGIN`]: 'inProgress',
            [`${namespace}/${store}/CLEAR_ERROR`]: 'loggedOut'
        }
    }
    const machines = d => ({
        auth: {
            initial: {
                [d.types.ATTEMPT_LOGIN]: 'inProgress'
            },
            inProgress: {
                [d.types.LOGIN_ERROR]: 'error',
                [d.types.LOGOUT_ERROR]: 'error',
                [d.types.LOGIN_SUCCESSFUL]: 'loggedIn',
                [d.types.LOGOUT_SUCCESSFUL]: 'loggedOut'
            },
            loggedIn: {
                [d.types.ATTEMPT_LOGOUT]: 'inProgress'
            },
            loggedOut: {
                [d.types.ATTEMPT_LOGIN]: 'inProgress'
            },
            error: {
                [d.types.ATTEMPT_LOGIN]: 'inProgress',
                [d.types.CLEAR_ERROR]: 'loggedOut'
            }
        }
    })

    t.test('...which transfers the \'machines\' prop to the duck instance', (nt) => {
        const duck = new Duck({namespace, store, types, machines: {auth}})
        nt.deepEqual(
            duck.machines.auth,
            auth,
            'verify the duck instance contains the \'auth\' machine'
        )
        nt.end()
    })

    t.test('...which can access the action types directly from the duck', (nt) => {
        const duck = new Duck({namespace, store, types, machines})
        nt.deepEqual(
            duck.machines.auth,
            auth,
            'verify the types were used from the duck to create the state machine'
        )
        nt.end()
    })

    t.test('...excludes inputs from a machine state which do NOT match a redux action type', (nt) => {
        const duck = new Duck({
            namespace,
            store,
            types,
            machines: {
                auth: {
                    ...auth,
                    loggedOut: {
                        ...auth.loggedOut,
                        [`${namespace}/${store}/NOT_A_VALID_ACTION_TYPE`]: 'loggedIn'
                    }
                }
            }
        })
        nt.deepEqual(
            duck.machines.auth,
            auth,
            'state will not change to \'loggedIn\' because the action type isn\'t registered for the current state to go there'
        )
        nt.end()
    })

    t.test('...wont\'t move to an invalid state despite a dispatched action whose purpose is to move to that state',
        (nt) => {
            const duck = new Duck({namespace, store, types, machines, initialState, reducer})
            const action = {
                type: `${namespace}/${store}/LOGIN_SUCCESSFUL`,
                user: {id: 123, name: 'David'}
            }
            nt.deepEqual(
                duck.reducer({...initialState, states: {auth: 'initial'}}, action),
                {...initialState, states: {auth: 'initial'}, user: {id: 123, name: 'David'}},
                'state cannot change to \'loggedIn\' from \'initial\', but must transition to \'inProgress\' and wait there'
            )
            nt.end()
        }
    )

    t.test('...can move to a VALID state when the approprate action is dispatched', (nt) => {
        const duck = new Duck({namespace, store, types, machines, initialState, reducer})
        nt.deepEqual(
            duck.reducer(initialState, {type: `${namespace}/${store}/ATTEMPT_LOGIN`}),
            {...initialState, states: {auth: 'inProgress'}},
            'state has changed from \'initial\' to \'inProgress\''
        )
        nt.end()
    })

    t.test('...advance to another state using the state machine manually, in the normal reducer', (nt) => {
        const duck = new Duck({
            useTransitions: false,
            namespace,
            store,
            types,
            machines,
            initialState,
            reducer: manualReducer
        })
        nt.deepEqual(
            duck.reducer({...initialState, states: {auth: 'initial'}}, {type: `${namespace}/${store}/ATTEMPT_LOGIN`}),
            {...initialState, states: {auth: 'inProgress'}},
            'state has changed from \'initial\' to \'inProgress\''
        )
        nt.end()
    })

    t.test('...whose machines can be extended', (nt) => {
        const duck = new Duck({namespace, initialState, store, types, machines: {auth}, reducer})
        const childDuck = duck.extend({
            types: ['SESSION_EXPIRED'],
            machines: {auth: {loggedIn: {[`${namespace}/${store}/SESSION_EXPIRED`]: 'loggedOut'}}},
            reducer: (state, action, dux) => {
                switch (action.type) {
                    case dux.types.SESSION_EXPIRED:
                        return dux.initialState
                    default:
                        return state
                }
            }
        })
        nt.deepEqual(childDuck.machines.auth.loggedIn, {
            [`${namespace}/${store}/ATTEMPT_LOGOUT`]: 'inProgress',
            [`${namespace}/${store}/SESSION_EXPIRED`]: 'loggedOut'
        }, 'verify the child duck shows the added input type of \'SESSION_EXPIRED\' on the \'loggedIn\' state')
        nt.deepEqual(
            childDuck.reducer({...initialState, states: {auth: 'loggedIn'}}, {type: `${namespace}/${store}/SESSION_EXPIRED`}),
            {...initialState, states: {auth: 'loggedOut'}},
            'state has changed from \'loggedIn\' to \'loggedOut\' when external SESSION_EXPIRED event occurred'
        )
        nt.end()
    })

    t.test('...tracks the machine states in the redux store', (nt) => {
        const duck = new Duck({
            namespace,
            store,
            types,
            machines,
            initialState,
            reducer
        })

        nt.deepEqual(
            duck.initialState.states,
            {auth: 'initial'},
            'initial state should include \'states\' even if not set up by the user'
        )
        nt.deepEqual(
            duck.reducer(initialState, {type: `${namespace}/${store}/ATTEMPT_LOGIN`}),
            {...initialState, states: {auth: 'inProgress'}},
            'the \'states\' prop from the redux store properly reflects the change from \'initial\' to \'inProgress\''
        )

        nt.end()
    })

    t.test('...allows custom prop name for tracking machine states in the redux store', (nt) => {
        const duck = new Duck({
            stateMachinesPropName: 'authStates',
            namespace,
            store,
            types,
            machines,
            initialState,
            reducer
        })

        nt.deepEqual(
            duck.initialState.authStates,
            {auth: 'initial'},
            'initial state should include \'authStates\' even if not set up by the user'
        )
        nt.deepEqual(
            duck.reducer(initialState, {type: `${namespace}/${store}/ATTEMPT_LOGIN`}),
            {...initialState, authStates: {auth: 'inProgress'}},
            'the \'authStates\' prop from the redux store properly reflects the change from \'initial\' to \'inProgress\''
        )

        nt.end()
    })

    t.test('...wont\'t move to an invalid state (also using the manual reducer pattern)',
        (nt) => {
            const duck = new Duck({
                namespace,
                store,
                types,
                machines,
                initialState,
                useTransitions: false,
                reducer: manualReducer
            })
            const action = {
                type: `${namespace}/${store}/LOGIN_SUCCESSFUL`,
                user: {id: 123, name: 'David'}
            }
            nt.deepEqual(
                duck.reducer({...initialState, states: {auth: 'initial'}}, action),
                {...initialState, states: {auth: 'initial'}, user: {id: 123, name: 'David'}},
                'verify the state did NOT change from \'initial\' to \'loggedIn\', but the reducer still processes the \'user\' payload'
            )
            nt.end()
        }
    )

    t.test('...wont\'t move to an invalid state and won\'t invoke the normal reducer when using strict mode',
        (nt) => {
            const duck = new Duck({
                namespace,
                store,
                types,
                machines,
                initialState,
                reducer,
                strictTransitions: true
            })
            const action = {
                type: `${namespace}/${store}/LOGIN_SUCCESSFUL`,
                user: {id: 123, name: 'David'}
            }
            nt.deepEqual(
                duck.reducer({...initialState, states: {auth: 'initial'}}, action),
                {...initialState, states: {auth: 'initial'}},
                'verify the state did NOT change from \'initial\' to \'loggedIn\' and the reducer (which processes \'user\') is canceled'
            )
            nt.end()
        }
    )

    t.end()
})

