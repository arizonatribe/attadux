import {and, assocPath, has, isEmpty, isNil, map, mergeDeepWith, or} from 'ramda'

import spected from 'spected'
import {
    anyValidationFailures,
    concatOrReplace,
    createPayloadValidator,
    invokeIfFn,
    leftValIfRightIsTrue,
    createMachines,
    createExtender,
    getDefaultStateForMachines,
    getNextState,
    getNextStateForMachine,
    pruneInvalidFields,
    pruneValidatedFields,
    isActionTypeInCurrentState,
    deriveSelectors
} from './helpers'
import {duxDefaults, validateAndSetValues, setProp} from './schema'
import {hasNestedProp, isPlainObj} from './is'

export default class Duck {
    constructor(opts = {}) {
        Object.assign(this, validateAndSetValues({...duxDefaults, ...opts}))

        setProp.call(this, 'validators', () => map(spected, invokeIfFn(this.options.validators)(this)))
        setProp.call(this, 'machines', () => createMachines(invokeIfFn(this.options.machines)(this), this))
        setProp.call(this, 'initialState', () => {
            const initial = invokeIfFn(this.options.initialState)(this)
            return isEmpty(this.machines) ? initial : {
                ...(isPlainObj(initial) ? initial : {}),
                ...assocPath(this.stateMachinesPropName, getDefaultStateForMachines(this.machines), {})
            }
        })
        setProp.call(this, 'selectors', () => deriveSelectors(invokeIfFn(this.options.selectors)(this)))
        setProp.call(this, 'creators', () => invokeIfFn(this.options.creators)(this))
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

        return {...reducer({...getState(), ...states}, action, this), ...states}
    }

    reducer(state, action = {}) {
        const {options: {reducer}, validators, cancelReducerOnValidationError} = this
        const getState = () => (isNil(state) ? this.initialState : state)

        if (isEmpty(validators)) {
            return reducer(getState(), action, this)
        }

        const isActionValidator = has(action.type, validators)
        const isPostReducerValidator = has('reducer', validators)

        if (isActionValidator || isPostReducerValidator) {
            const validate = (validator, data) => {
                const validationResult = validator(data)
                if (!anyValidationFailures) {
                    return data
                } else if (cancelReducerOnValidationError === true) {
                    return getState()
                } else if (isActionValidator) {
                    return reducer(getState(), {
                        ...pruneInvalidFields(action, validationResult),
                        validationErrors: pruneValidatedFields(validationResult)
                    }, this)
                }

                return {
                    ...getState(),
                    ...pruneInvalidFields(
                        mergeDeepWith(leftValIfRightIsTrue, data, validationResult), validationResult
                    ),
                    validationErrors: pruneValidatedFields(validationResult)
                }
            }

            if (isActionValidator) {
                return validate(validators[action.type], action)
            } else if (isPostReducerValidator) {
                return validate(validators.reducer, reducer(getState(), action, this))
            }
        }

        return reducer(getState(), action, this)
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
            consts: mergeDeepWith(concatOrReplace, parentOptions.consts, extendedOptions.consts),
            reducer: (state, action, duck) => {
                const reduced = parentOptions.reducer(isNil(state) ? duck.initialState : state, action, duck)
                return (isNil(extendedOptions.reducer)) ? reduced : extendedOptions.reducer(reduced, action, duck)
            }
        })
    }
}
