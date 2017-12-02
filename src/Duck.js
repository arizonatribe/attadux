import {concat, has, is, isEmpty, isNil, mergeDeepWith, values, zipObj} from 'ramda'
import {
    invokeIfFn,
    createConstants,
    createMachines,
    createExtender,
    findMachineName,
    getCurrentState,
    getNextState,
    getNextStateFromNamedMachine,
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

        this.consts = createConstants(consts)
        this.types = zipObj(types, types.map(type => `${namespace}/${store}/${type}`))
        this.validators = Object.freeze(invokeIfFn(validators)(this))
        this.initialState = invokeIfFn(initialState)(this)
        this.machines = createMachines(invokeIfFn(machines)(this), this)
        this.selectors = deriveSelectors(invokeIfFn(selectors)(this))
        this.creators = invokeIfFn(creators)(this)
        this.reducer = (!isEmpty(this.machines) &&
            (strictTransitions === true || useTransitions === true)) ?
            this.transitions.bind(this) :
            this.reducer.bind(this)
        this.getNextState = getNextState.bind(this)
        this.getNextStateFromNamedMachine = getNextStateFromNamedMachine.bind(this)
    }

    transitions(state, action = {}) {
        const {currentStateProp = 'currentState'} = action
        const {initialState, strict, options: {reducer}} = this
        const getState = () => (isNil(state) ? initialState : state)
        const currentState = getCurrentState(state, action)

        if (isNil(currentState)) {
            return reducer(getState(), action, this)
        }

        if (strict) {
            const machineName = findMachineName(action, getState()[currentStateProp], this)
            const nextState = this.getNextStateFromNamedMachine(machineName)(getState(), action)
            if (machineName && values(this.machines[machineName]).some(has(action.type))) {
                return {
                    ...reducer(getState(), action, this),
                    [currentStateProp]: nextState
                }
            }

            return getState()
        }

        return {
            ...reducer(getState(), action, this),
            [currentStateProp]: this.getNextState(state, action)
        }
    }

    reducer(state, action = {}) {
        return this.options.reducer(isNil(state) ? this.initialState : state, action, this)
    }

    extend(opts) {
        const parentOptions = this.options
        const extendedOptions = {...duxDefaults, ...parentOptions, ...invokeIfFn(opts)(this)}
        const extendProp = createExtender(this, extendedOptions)

        return new Duck({
            ...extendedOptions,
            ...extendProp('initialState'),
            ...extendProp('validators'),
            ...extendProp('machines'),
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
