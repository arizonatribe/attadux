/* eslint "max-len": "off" */
import test from 'tape'
import {createDuck} from '../src/duck'

test('state machines:', (t) => {
    const namespace = 'attadux'
    const store = 'auth'
    const types = [
        'AGREE_TO_TERMS',
        'ATTEMPT_LOGIN',
        'ATTEMPT_LOGOUT',
        'CLEAR_ERROR',
        'LOGIN_SUCCESSFUL',
        'LOGIN_ERROR',
        'LOGOUT_SUCCESSFUL',
        'LOGOUT_ERROR',
        'REJECT_TERMS'
    ]
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
        },
        termsOfService: {
            initial: {
                [d.types.AGREE_TO_TERMS]: 'agreed',
                [d.types.REJECTED_TERMS]: 'rejected'
            },
            agreed: {},
            rejected: {}
        }
    })

    t.test('...which transfers the \'machines\' prop to the duck instance', (nt) => {
        const duck = createDuck({namespace, store, types, machines: {auth}})
        nt.deepEqual(
            duck.machines.auth,
            auth,
            'verify the duck instance contains the \'auth\' machine'
        )
        nt.end()
    })

    t.test('...which can access the action types directly from the duck', (nt) => {
        const duck = createDuck({namespace, store, types, machines})
        nt.deepEqual(
            duck.machines.auth,
            auth,
            'verify the types were used from the duck to create the state machine'
        )
        nt.end()
    })

    t.test('...excludes inputs from a machine state which do NOT match a redux action type', (nt) => {
        const duck = createDuck({
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

    t.end()
})

