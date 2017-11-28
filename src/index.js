import {
    allPass,
    anyPass,
    complement,
    compose,
    concat,
    converge,
    either,
    forEach,
    has,
    init,
    is,
    isNil,
    keys,
    last,
    memoize,
    mergeDeepWith,
    not,
    pick,
    pickBy,
    reduce,
    toPairs,
    values,
    zipObj
} from 'ramda'
import spected from 'spected'

const duxDefaults = {
    consts: {},
    creators: (() => ({})),
    machines: {},
    selectors: {},
    types: [],
    validators: {}
}
const invokeIfFn = (context, fn) => (is(Function, fn) ? fn(context) : fn)
const createExtender = (context, options) =>
    (key) => {
        if (is(Function, options[key])) {
            return {
                [key]: duck => ({
                    ...invokeIfFn(duck, context.options[key]),
                    ...options[key](duck, invokeIfFn(duck, context.options[key]))
                })
            }
        } else if (isNil(options[key])) {
            return {[key]: context.options[key]}
        }
        return {
            [key]: {...context.options[key], ...options[key]}
        }
    }

const createMachineStates = (machine = {}, {types} = {}) => {
    const validStates = {}

    toPairs(machine)
        .filter(([state, transitions]) =>
            is(String, state)
            && values(transitions).every(st => is(String, st) && has(st, machine))
            && keys(transitions).some(at => is(String, at) && values(types).includes(at))
        )
        .forEach(([state, transitions]) => {
            validStates[state] = pick(
                keys(transitions).filter(at => is(String, at) && values(types).includes(at)),
                transitions
            )
        })

    return Object.freeze(validStates)
}
const createMachines = (machines = {}, context = {}) => {
    const validMachines = {}
    toPairs(machines).forEach(([name, machine]) => {
        validMachines[name] = createMachineStates(machine, context)
    })
    return Object.freeze(validMachines)
}

export const isNotNil = complement(isNil)
export const isNotBlankString = s => not(/^\s*$/.test(s))
export const isStringieThingie = allPass([
    isNotBlankString,
    either(is(Number), is(String)),
    isNotNil
])
export const isPrimitive = anyPass([
    is(Boolean),
    is(Number),
    is(String),
    is(Date)
])

export const createSelector = (...selectors) =>
    memoize(converge(last(selectors), init(selectors)))
export const createValidator = rules => {
    const fields = Object.keys(rules)
    return compose(
        pickBy(val => val !== true),
        vals => spected(rules, {
            ...reduce((obj, key) => ({...obj, [key]: ''}), {}, fields),
            ...vals
        })
    )
}

export class Selector {
    constructor(func) {
        this.func = func
    }

    extractFunction(selectors) {
        return this.func(selectors)
    }
}

const isDuxSelector = selector => (selector instanceof Selector)
/**
 * Helper utility to assist in creating the constants and making them immutable.
 *
 * @param {object} constants object which must contain only primitive values or arrays of primitives
 * @returns {object} constants parsed, validated and frozen
 */
function createConstants(consts = {}) {
    const constants = {}

    /* no nested functions or objects, just primitives or conversion of arrays
     * of primitives into simple objects whose keys and vals are the same */

    if (!isPrimitive(consts) && !is(Array, consts) && is(Object, consts)) {
        toPairs(consts).forEach(([name, value]) => {
            if (is(Array, value)) {
                /* Creates an object whose keys and values are identical */
                constants[name] = Object.freeze(zipObj(value.filter(isPrimitive), value.filter(isPrimitive)))
            } else if (isPrimitive(value) || is(RegExp, value)) {
                /* Otherwise assigns  */
                constants[name] = value
            }
        })
    }

    /* Freeze everything, to make immutable (the zipped objects were already frozen when created) */
    return Object.freeze(constants)
}

/**
 * Helper utility to assist in composing the selectors.
 * Previously defined selectors can be used to derive future selectors.
 *
 * @param {object} selectors
 * @returns {object} selectors, but now with access to fellow selectors
 */
function deriveSelectors(selectors = {}) {
    const composedSelectors = {...selectors}

    compose(
        forEach(([key, selector]) => {
            composedSelectors[key] = selector.extractFunction(composedSelectors)
        }),
        toPairs,
        pickBy(isDuxSelector)
    )(composedSelectors)

    return composedSelectors
}

export default class Duck {
    constructor(options = {}) {
        this.options = {...duxDefaults, ...options}

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
        this.validators = Object.freeze(invokeIfFn(this, validators))
        this.initialState = invokeIfFn(this, initialState)
        this.machines = createMachines(invokeIfFn(this, machines), this)
        this.selectors = deriveSelectors(invokeIfFn(this, selectors))
        this.creators = invokeIfFn(this, creators)
        this.reducer = this.reducer.bind(this)
        this.getNextState = (machineName = '') =>
            (currentState = '', {type = ''} = {}) => {
                if (type && has(type, this.machines[machineName][currentState])) {
                    return this.machines[machineName][currentState][type]
                }
                return currentState
            }
    }


    reducer(state, action = {}) {
        return this.options.reducer(isNil(state) ? this.initialState : state, action, this)
    }

    extend(options = {}) {
        const opts = {...duxDefaults, ...invokeIfFn(this, options)}
        const parent = this.options
        const extendProp = createExtender(this, opts)

        return new Duck({
            ...parent,
            ...opts,
            ...extendProp('initialState'),
            ...extendProp('validators'),
            ...extendProp('machines'),
            ...extendProp('selectors'),
            ...extendProp('creators'),
            types: [...parent.types, ...opts.types],
            consts: mergeDeepWith(concat, parent.consts, opts.consts),
            reducer: (state, action, duck) => {
                const reduced = parent.reducer(isNil(state) ? duck.initialState : state, action, duck)
                return (isNil(opts.reducer)) ? reduced : opts.reducer(reduced, action, duck)
            }
        })
    }
}

Duck.Selector = Selector
