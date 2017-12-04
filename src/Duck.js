import {concat, has, is, isEmpty, isNil, map, mergeDeepWith, zipObj} from 'ramda'
import spected from 'spected'
import {
    invokeIfFn,
    createConstants,
    createMachines,
    createExtender,
    getDefaultStateForMachines,
    getNextState,
    getNextStateForMachine,
    currentStateHasType,
    deriveSelectors
} from './helpers'
import Selector from './Selector'

export const duxDefaults = {
    consts: {},
    creators: {},
    machines: {},
    selectors: {},
    types: [],
    validators: {}
}

class Duck {
    constructor(opts = {}) {
        this.options = {...duxDefaults, ...opts}

        const {
            useTransitions = true,
            strictTransitions = false,
            stateMachinesPropName = 'states',
            namespace,
            store,
            types,
            consts,
            initialState,
            machines,
            creators,
            selectors,
            validators
        } = this.options

        /*
         * Determines whether the reducer is canceled when a given action
         * is not listed among the accepted inputs for the current state
         * This does not mean you only accept actions which change state,
         * but rather you that you whitelist (or register) every action
         * and set their value to remain in the current state.
         */
        if (is(Boolean, strictTransitions)) {
            this.strict = strictTransitions
        }

        this.statesProp = stateMachinesPropName
        this.consts = createConstants(consts)
        this.types = zipObj(types, types.map(type => `${namespace}/${store}/${type}`))
        this.validators = map(spected, invokeIfFn(validators)(this))
        this.machines = createMachines(invokeIfFn(machines)(this), this)
        this.initialState = invokeIfFn(initialState)(this)
        if (!isEmpty(this.machines)) {
            this.initialState = {
                ...(is(Object, this.initialState) ? this.initialState : {}),
                [stateMachinesPropName]: getDefaultStateForMachines(this.machines)
            }
        }
        this.selectors = deriveSelectors(invokeIfFn(selectors)(this))
        this.creators = invokeIfFn(creators)(this)
        this.reducer = (!isEmpty(this.machines) &&
            (strictTransitions === true || useTransitions === true)) ?
            this.transitions.bind(this) :
            this.reducer.bind(this)
        this.getNextState = getNextState.bind(this)
        this.getNextStateForMachine = getNextStateForMachine.bind(this)
    }

    transitions(state, action = {}) {
        const {initialState, statesProp, strict, options: {reducer}} = this
        const getState = () => {
            if (isNil(state)) {
                return initialState
            } else if (has(statesProp, state)) {
                return state
            }
            
            return {...state, [statesProp]: initialState[statesProp]}
        }

        if (strict && !currentStateHasType(getState(), action, this)) {
            return getState()
        }

        const states = this.getNextState(getState(), action, this)

        return {
            ...reducer({...getState(), [statesProp]: states}, action, this),
            [statesProp]: states
        }
    }

    reducer(state, action = {}) {
        return this.options.reducer(isNil(state) ? this.initialState : state, action, this)
    }

    extend(opts) {
        const parentOptions = this.options
        const extendedOptions = {...duxDefaults, ...parentOptions, ...invokeIfFn(opts)(this)}
        const extendProp = createExtender(this, extendedOptions)
        const extendFromParentOptions = createExtender(parentOptions, extendedOptions)

        return new Duck({
            ...extendedOptions,
            ...extendProp('initialState'),
            ...extendProp('machines'),
            ...extendFromParentOptions('validators'),
            ...extendProp('selectors'),
            ...extendProp('creators'),
            types: [...parentOptions.types, ...extendedOptions.types],
            consts: mergeDeepWith(concat, parentOptions.consts, extendedOptions.consts),
            reducer: (state, action, duck) => {
                const reduced = parentOptions.reducer(isNil(state) ? duck.initialState : state, action, duck)
                return (isNil(extendedOptions.reducer)) ? reduced : extendedOptions.reducer(reduced, action, duck)
            }
        })
    }
}

Duck.Selector = Selector

export default Duck
