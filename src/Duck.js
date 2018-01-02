import spected from 'spected'
import {assocPath, has, isEmpty, isNil, map, mergeDeepWith} from 'ramda'
import {duxDefaults, validateAndSetValues, setProp} from './schema'
import {isPlainObj} from './helpers/is'
import {coerceToFn} from './helpers/coerce'
import {createExtender} from './helpers/duck'
import {concatOrReplace} from './helpers/types'
import {deriveSelectors} from './helpers/selectors'
import {createPayloadValidator, createPayloadValidationsLogger, createPayloadPruner} from './helpers/validations'
import {createMachines, getDefaultStateForMachines, getNextState, getNextStateForMachine} from './helpers/machines'


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
        setProp.call(this, 'reducer', () => this.reducer.bind(this))

        if (has('validators', this)) {
            this.isPayloadValid = createPayloadValidator(this.validators)
            this.getValidationErrors = createPayloadValidationsLogger(this.validators)
            this.pruneInvalidFields = createPayloadPruner(this.validators)
        }
        if (has('machines', this)) {
            this.getNextState = getNextState.bind(this)
            this.getNextStateForMachine = getNextStateForMachine.bind(this)
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
