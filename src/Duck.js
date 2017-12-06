import {and, has, isEmpty, isNil, map, mergeDeepWith, or} from 'ramda'
import spected from 'spected'
import {
    anyValidationFailures,
    concatOrReplace,
    createPayloadValidator,
    invokeIfFn,
    leftValIfRightIsTrue,
    leftValIfRightIsNotTrue,
    createMachines,
    createExtender,
    getDefaultStateForMachines,
    getNextState,
    getNextStateForMachine,
    pruneInvalidFields,
    currentStateHasType,
    deriveSelectors
} from './helpers'
import {duxDefaults, validateAndSetValues, setProp} from './schema'
import {isPlainObj} from './is'

export default class Duck {
    constructor(opts = {}) {
        Object.assign(this, validateAndSetValues({...duxDefaults, ...opts}))

        setProp.call(this, 'validators', () => map(spected, invokeIfFn(this.options.validators)(this)))
        setProp.call(this, 'machines', () => createMachines(invokeIfFn(this.options.machines)(this), this))
        setProp.call(this, 'initialState', () => {
            const initial = invokeIfFn(this.options.initialState)(this)
            return isEmpty(this.machines) ? initial : {
                ...(isPlainObj(initial) ? initial : {}),
                [this.stateMachinesPropName]: getDefaultStateForMachines(this.machines)
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
            } else if (has(stateMachinesPropName, state)) {
                return state
            }
            
            return {...state, [stateMachinesPropName]: initialState[stateMachinesPropName]}
        }

        if (strictTransitions && !currentStateHasType(getState(), action, this)) {
            return getState()
        }

        const states = this.getNextState(getState(), action, this)

        return {
            ...reducer({...getState(), [stateMachinesPropName]: states}, action, this),
            [stateMachinesPropName]: states
        }
    }

    reducer(state, action = {}) {
        const {options: {reducer}, validators, cancelReducerOnValidationError} = this
        const getState = () => (isNil(state) ? this.initialState : state)

        if (isEmpty(validators)) {
            return reducer(getState(), action, this)
        }

        let validationResult = {}
        const isActionValidator = has(action.type, validators)
        if (isActionValidator) {
            validationResult = validators[action.type](action)
        } else if (has('reducer', validators)) {
            validationResult = validators.reducer(getState())
        }

        if (!anyValidationFailures(validationResult)) {
            return reducer(getState(), action, this)
        } else if (cancelReducerOnValidationError === true) {
            return getState()
        }

        if (isActionValidator) {
            return reducer(getState(), {
                ...pruneInvalidFields(action, validationResult),
                validationErrors: validationResult
            }, this)
        }

        const validationsWithOriginalState = mergeDeepWith(
            leftValIfRightIsNotTrue,
            getState(),
            validationResult
        )

        return {
            ...mergeDeepWith(
                leftValIfRightIsTrue,
                isActionValidator ? action : reducer(getState(), action, this),
                validationsWithOriginalState
            ),
            validationErrors: validationResult
        }
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
