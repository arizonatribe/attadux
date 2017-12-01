import {concat, is, isNil, mergeDeepWith, zipObj} from 'ramda'
import {invokeIfFn, createConstants, createMachines, createExtender, deriveSelectors} from './helpers'
import {isTransitionPossible} from './is'
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

        this.consts = createConstants(consts)
        this.types = zipObj(types, types.map(type => `${namespace}/${store}/${type}`))
        this.validators = Object.freeze(invokeIfFn(validators)(this))
        this.initialState = invokeIfFn(initialState)(this)
        this.machines = createMachines(invokeIfFn(machines)(this), this)
        this.selectors = deriveSelectors(invokeIfFn(selectors)(this))
        this.creators = invokeIfFn(creators)(this)
        this.reducer = this.reducer.bind(this)
        this.getNextState = (machineName = '') =>
            (currentState = '', {type = ''} = {}) => {
                if (isTransitionPossible(type, currentState, this.machines[machineName])) {
                    return this.machines[machineName][currentState][type]
                }
                return is(String, currentState) ? currentState : null
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
