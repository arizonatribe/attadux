/* eslint "max-len": "off" */
import test from 'tape'
import {getCurrentState} from '../src/helpers'

test('getCurrentState', (t) => {
    const initialState = {
        states: {
            auth: 'initial',
            termsOfService: 'initial'
        }
    }
    const machines = {
        auth: {
            initial: {
                LOGIN_SUCCESSFUL: 'loggedIn'
            },
            loggedIn: {
                LOGOUT_SUCCESSFUL: 'loggedOut'
            },
            loggedOut: {
                LOGIN_SUCCESSFUL: 'loggedIn'
            }
        },
        termsOfService: {
            initial: {
                AGREE_TO_TERMS: 'agreed',
                REJECTED_TERMS: 'rejected'
            },
            agreed: {},
            rejected: {}
        }
    }

    test('...fails gracefully', (nt) => {
        nt.deepEqual(getCurrentState(), {}, 'always returns an object')
        nt.end()
    })

    test('...retrieves current state of each machine', (nt) => {
        nt.deepEqual(
            getCurrentState(initialState, {machines, stateMachinesPropName: 'states'}),
            {auth: 'initial', termsOfService: 'initial'},
            'verify the current state of \'initial\''
        )
        nt.end()
    })
    t.end()
})
