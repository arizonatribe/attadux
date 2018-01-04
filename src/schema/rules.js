import {
    all,
    allPass,
    anyPass,
    both,
    compose,
    either,
    equals,
    filter,
    is,
    last,
    length,
    map,
    split,
    toPairs,
    uniq,
    values
} from 'ramda'
import {areStateNamesStrings, areInputsAndTransitionsStrings, isEachTransitionAmongMachineStates} from '../machines'
import {isNotEmpty, isPrimitiveish, isPlainObj, isStringieThingie} from '../helpers/is'
import {isValidationLevel} from '../validators'

export const duxDefaults = {
    consts: {},
    creators: {},
    machines: {},
    selectors: {},
    stateMachinesPropName: 'states',
    types: [],
    validationLevel: 'CANCEL',
    validators: {}
}

export const duxRules = {
    validationLevel: [[isValidationLevel, 'must be: STRICT, CANCEL, PRUNE, or LOG. CANCEL is the default.']],
    store: [[isStringieThingie, 'must be a (non-blank) string']],
    namespace: [[isStringieThingie, 'must be a (non-blank) string']],
    stateMachinesPropName: [[
        either(isStringieThingie, both(is(Array), all(isStringieThingie))),
        'must be a string (or array of strings)'
    ]],
    consts: [[either(isPlainObj, is(Function)), 'must be an object (or a function returning an object)']],
    creators: [[either(isPlainObj, is(Function)), 'must be an object (or a function returning an object)']],
    machines: [[either(isPlainObj, is(Function)), 'must be an object (or a function returning an object)']],
    selectors: [[either(isPlainObj, is(Function)), 'must be an object (or a function returning an object)']],
    types: [[both(is(Array), all(is(String))), 'must be an object (or a function returning an object)']],
    validators: [[either(isPlainObj, is(Function)), 'must be an object (or a function returning an object)']],
    reducer: [[is(Function), 'must be a function']],
    initialState: [[
        anyPass([isPrimitiveish, isPlainObj, is(Function)]),
        'must be an object, a function returning an object, or a primitive value'
    ]]
}

export const duckMiddlewareRules = {
    constructor: {
        name: [[equals('Duck'), 'must be a Duck instance']]
    },
    store: [[isStringieThingie, 'must be a (non-blank) string']],
    namespace: [[isStringieThingie, 'must be a (non-blank) string']],
    types: [
        [isPlainObj, 'must be an object'],
        [compose(
            all(compose(equals(1), length, uniq)),
            map(([key, val]) => ([key, compose(last, split('/'))(val)])),
            filter(all(is(String))),
            toPairs
        ), 'each key and value are identical']
    ],
    machines: [
        [compose(all(isPlainObj), values), 'must be an object'],
        [compose(all(isNotEmpty), values), 'must not be empty'],
        [compose(all(allPass([areStateNamesStrings, areInputsAndTransitionsStrings])), values),
            'each machine contains nested objects (states) whose inputs and transitions are strings'
        ],
        [compose(all(isEachTransitionAmongMachineStates), values), 'each transition value must also be a state']
    ],
    stateMachinesPropName: [[
        both(is(Array), all(isStringieThingie)),
        'must be an array of strings (representing the path to the "current state" prop)'
    ]]
}
