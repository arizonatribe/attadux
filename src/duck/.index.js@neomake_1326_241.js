import {always, compose, converge, mergeDeepRight, tap, uncurryN} from 'ramda'
import {duxDefaults} from '../schema/rules'
// import {extendDuckOptions} from '../helpers/duck'

import log from '../../test/util'

import {
    createDuckValidators,
    createDuckMachines,
    createDuckInitialState,
    createDuckSelectors,
    createDuckActionCreators,
    createDuckReducers,
    createDuckMetadata,
    createValidationMiddlewareHelpers
} from './creators'

export const createDuck = compose(
    Object.freeze,
    // tap(log('after extender')),
    // createDuckExtender,
    // tap(log('after middleware')),
    createValidationMiddlewareHelpers,
    // tap(log('after reducers')),
    createDuckReducers,
    tap(log('after action creators')),
    createDuckActionCreators,
    // tap(log('after selectors')),
    createDuckSelectors,
    // tap(log('after initialState')),
    createDuckInitialState,
    // tap(log('after machines')),
    createDuckMachines,
    // tap(log('after validators')),
    createDuckValidators,
    // tap(log('after duck basic metadata')),
    createDuckMetadata,
    // tap(log('after defaulting')),
    mergeDeepRight(duxDefaults)
)

export const extendDuck = converge(
    compose, [always(createDuck), createDuckExtender]
)

export const extendDuckWith = uncurryN(2, extendDuck)
