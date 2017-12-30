/* eslint "max-len": "off" */
import test from 'tape'
import {zipObj} from 'ramda'
import {getCurrentState, createMachines} from '../src/helpers/machines'

test('getCurrentState', (t) => {
    const initialState = {
        states: {
            auth: 'initial',
            termsOfService: 'initial'
        }
    }
    const types = ['LOGIN_SUCCESSFUL', 'LOGOUT_SUCCESSFUL', 'AGREE_TO_TERMS', 'REJECTED_TERMS']
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

    test('...fails to createMachines when inputs aren\'t action types', (nt) => {
        nt.deepEqual(
            createMachines(machines), {
                auth: {initial: {}, loggedIn: {}, loggedOut: {}},
                termsOfService: {initial: {}, agreed: {}, rejected: {}}
            }, 'machines are empty if input types aren\'t registered'
        )
        nt.end()
    })

    test('...succeeds in createMachines attempt when inputs are also action types', (nt) => {
        nt.deepEqual(
            createMachines(machines, {types: zipObj(types, types)}),
            machines,
            'machines contain all the registered action types as inputs'
        )
        nt.end()
    })

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
