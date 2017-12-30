import spected from 'spected'
import {and, assocPath, has, isEmpty, isNil, map, mergeDeepWith, or} from 'ramda'
import {coerceToFn} from './helpers/coerce'
import {isPlainObj, hasNestedProp} from './helpers/is'
import {
    createMachines,
    getDefaultStateForMachines,
    getNextState,
    getNextStateForMachine,
    isActionTypeInCurrentState
} from './helpers/machines'
import {createExtender} from './helpers/duck'
import {deriveSelectors} from './helpers/selectors'
import {createPayloadValidator} from './helpers/validations'
import {duxDefaults, validateAndSetValues, setProp} from './schema'
import {concatOrReplace} from './helpers/types'


export default class Duck {
    constructor(opts = {}) {
        Object.assign(this, validateAndSetValues({...duxDefaults, ...opts}))

        setProp.call(this, 'validators', () => map(spected, coerceToFn(this.options.validators)(this)))
        setProp.call(this, 'machines', () => createMachines(coerceToFn(this.options.machines)(this), this))
        setProp.call(this, 'initialState', () => {
            const initial = coerceToFn(this.options.initialState)(this)
            return isEmpty(this.machines) ? initial : {
                ...(isPlainObj(initial) ? initial : {}),
                ...assocPath(this.stateMachinesPropName, getDefaultStateForMachines(this.machines), {})
            }
        })
        setProp.call(this, 'selectors', () => deriveSelectors(coerceToFn(this.options.selectors)(this)))
        setProp.call(this, 'creators', () => coerceToFn(this.options.creators)(this))
        setProp.call(this, 'reducer', () => (
            and(!isEmpty(this.machines), or(this.strictTransitions, this.useTransitions)) ?
            this.transitions.bind(this) : this.reducer.bind(this)
        ))

        if (has('validators', this)) {
            this.isPayloadValid = createPayloadValidator(this.validators)
        }
        if (has('machines', this)) {
            this.getNextState = getNextState.bind(this)
            this.getNextStateForMachine = getNextStateForMachine.bind(this)
        }
    }

    transitions(state, action = {}) {
        const {initialState, stateMachinesPropName, strictTransitions, options: {reducer}} = this

        const getState = () => {
            if (isNil(state)) {
                return initialState
            } else if (hasNestedProp(stateMachinesPropName, state)) {
                return state
            }
            return {...state, ...assocPath(stateMachinesPropName, initialState, {})}
        }

        if (strictTransitions && !isActionTypeInCurrentState(getState(), action, this)) {
            return getState()
        }

        const states = assocPath(stateMachinesPropName, this.getNextState(getState(), action), {})

        return {
            ...reducer({...getState(), ...states}, action, this),
            ...states
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
            types: [...parentOptions.types, ...extendedOptions.types],
            consts: mergeDeepWith(concatOrReplace, parentOptions.consts, extendedOptions.consts),
            reducer: (state, action, duck) => {
                const reduced = parentOptions.reducer(isNil(state) ? duck.initialState : state, action, duck)
                return (isNil(extendedOptions.reducer)) ? reduced : extendedOptions.reducer(reduced, action, duck)
            }
        })
    }
}
