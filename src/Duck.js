import spected from 'spected'
import {assocPath, has, isNil, map, mergeDeepWith} from 'ramda'
import {validateAndSetValues, setProp} from './schema'
import {isPlainObj, isNotEmpty, coerceToFn, createExtender} from './helpers'
import {duxDefaults} from './schema/rules'
import {deriveSelectors} from './selectors'
import {concatOrReplace} from './types'
import {createPayloadValidator, createPayloadValidationsLogger, createPayloadPruner} from './validators'
import {addTransitionsToState, createMachines, getDefaultStateForMachines, getNextState} from './machines'


export default class Duck {
    constructor(opts = {}) {
        Object.assign(this, validateAndSetValues({...duxDefaults, ...opts}))

        setProp.call(this, 'validators', () => map(spected, coerceToFn(this.options.validators)(this)))
        setProp.call(this, 'machines', () => createMachines(coerceToFn(this.options.machines)(this), this))
        setProp.call(this, 'initialState', () => {
            const initial = coerceToFn(this.options.initialState)(this)
            return isNotEmpty(this.machines) ? {
                ...(isPlainObj(initial) ? initial : {}),
                ...assocPath(this.stateMachinesPropName, getDefaultStateForMachines(this.machines), {})
            } : initial
        })
        setProp.call(this, 'selectors', () => deriveSelectors(coerceToFn(this.options.selectors)(this)))
        setProp.call(this, 'creators', () => coerceToFn(this.options.creators)(this))
        setProp.call(this, 'reducer', () => (
            isNotEmpty(this.machines) ? this.transitions.bind(this) : this.reducer.bind(this)
        ))

        if (has('validators', this)) {
            this.isPayloadValid = createPayloadValidator(this.validators)
            this.getValidationErrors = createPayloadValidationsLogger(this.validators)
            this.pruneInvalidFields = createPayloadPruner(this.validators)
        }
    }

    transitions(state, action = {}) {
        const stateWithTransitions = addTransitionsToState(state, this)

        const updatedStates = assocPath(
            this.stateMachinesPropName, getNextState(stateWithTransitions, action, this), {}
        )

        return {
            ...this.options.reducer({...stateWithTransitions, ...updatedStates}, action, this),
            ...updatedStates
        }
    }

    reducer(state, action = {}) {
        return this.options.reducer(isNil(state) ? this.initialState : state, action, this)
    }

    extend(opts) {
        const parentOptions = this.options
        const extendedOptions = {...duxDefaults, ...parentOptions, ...coerceToFn(opts)(this)}
        const extendProp = createExtender(this, extendedOptions)
        const extendFromParentOptions = createExtender(parentOptions, extendedOptions)

        return new Duck({
            ...extendedOptions,
            ...extendProp('initialState'),
            ...extendProp('machines'),
            ...extendFromParentOptions('validators'),
            ...extendProp('selectors'),
            ...extendProp('creators'),
            consts: mergeDeepWith(concatOrReplace, parentOptions.consts, extendedOptions.consts),
            types: [...parentOptions.types, ...extendedOptions.types],
            reducer: (state, action, duck) => {
                const reduced = parentOptions.reducer(isNil(state) ? duck.initialState : state, action, duck)
                return (isNil(extendedOptions.reducer)) ? reduced : extendedOptions.reducer(reduced, action, duck)
            }
        })
    }
}
