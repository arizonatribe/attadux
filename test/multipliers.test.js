import test from 'tape'
import {always, either, prop, tryCatch} from 'ramda'
import {createDuck, createDuckSelector, createSelector, extendDuck} from '../src'
import {makeMultipliers} from '../src/duck/create'

const duck = createDuck({
    namespace: 'myApp',
    store: 'orderFulfillment',
    consts: {
        metaDefaluts: {
            method: 'get',
            baseUrl: 'http://localhost/api/',
            headers: {
                'content-type': 'application/json'
            }
        }
    },
    types: [
        'POST_LOGIN',
        'GET_ORDER_FORM_ENUMS',
        'GET_ORDER_FORM_ENUMS_SUCCESS',
        'GET_ORDER_ITEM_FORM_ENUMS',
        'GET_ORDER_ITEM_FORM_ENUMS_SUCCESS',
        'GET_SHIPPING_FORM_ENUMS',
        'GET_SHIPPING_FORM_ENUMS_SUCCESS'
    ],
    debouncing: [
        [(action) => action.api === 'orders', 1000],
        [9999],
        [new RegExp(/_KEY_PRESS$/), 200]
    ],
    throttling: ({types}) => [
        [types.POST_LOGIN, 5000],
        [types.GET_ORDER_FORM_ENUMS, 'not a number'],
        [types.GET_ORDER_ITEM_FORM_ENUMS, 5000, 'lorem ipsum'],
        [9999, 9999],
        [new RegExp(/_MESSAGE$/), 500]
    ],
    initialState: {
        enums: {}
    },
    selectors: {
        getResults: action => action.response.data.results,
        getEntityName: tryCatch(
            type => type.match(/(.*)(GET_)(.*)(_FORM_ENUMS)(?:_SUCCESS)$/)[3],
            always('')
        ),
        getEndpoint: createDuckSelector(selectors => createSelector(
            selectors.getEntityName,
            entity => entity.replace(/_/, '-').toLowerCase()
        ))
    },
    enhancers: ({types, selectors}) => ({
        [types.GET_ORDER_FORM_ENUMS_SUCCESS]: {enums: selectors.getResults},
        [types.GET_ORDER_ITEM_FORM_ENUMS_SUCCESS]: {enums: selectors.getResults},
        [types.GET_SHIPPING_FORM_ENUMS_SUCCESS]: {enums: selectors.getResults}
    }),
    reducer(state, action, {types, selectors}) {
        switch (action.type) {
            case types.GET_SHIPPING_FORM_ENUMS_SUCCESS:
            case types.GET_ORDER_FORM_ENUMS_SUCCESS:
            case types.GET_ORDER_ITEM_FORM_ENUMS_SUCCESS:
                return {
                    ...state,
                    enums: {...state.enums, [selectors.getEntityName(action.type)]: action.enums}
                }
            default:
              return state
        }
    },
    creators: ({types}) => ({
        fetchOrderEnums: () => ({type: types.GET_ORDER_FORM_ENUMS}),
        fetchOrderItemEnums: () => ({type: types.GET_ORDER_ITEM_FORM_ENUMS}),
        fetchShippingEnums: () => ({type: types.GET_SHIPPING_FORM_ENUMS})
    }),
    multipliers: ({types, consts, selectors, creators}) => ({
        [types.POST_LOGIN]: [
            creators.fetchOrderEnums(),
            creators.fetchOrderItemEnums(),
            creators.fetchShippingEnums()
        ].map(action => ({
            ...action,
            config: ({token}) => ({
                ...consts.metaDefaluts,
                url: [
                    consts.metaDefaluts.baseUrl,
                    selectors.getEntityName(action.type)
                ].join('/'),
                headers: {
                    ...consts.metaDefaluts.headers,
                    authorization: `Bearer ${token}`
                }
            })
        }))
    })
})

test('"makeMultiplier" creates a function that takes an action (Object) and creates an Array of new ones', (t) => {
    const token = 'consectetur.elipsing.elit'
    const makeHeaders = props => ({authorization: `Bearer ${props.token}`})
    const loremMultiplier = makeMultipliers([
        {type: 'dolor', headers: makeHeaders},
        {type: 'sit', headers: makeHeaders},
        {type: 'amet', headers: makeHeaders}
    ])
    t.equal(typeof loremMultiplier, 'function', 'duck multipliers are functions')
    t.deepEqual(
        loremMultiplier({type: 'lorem', token}), [
            {type: 'dolor', token, headers: {authorization: 'Bearer consectetur.elipsing.elit'}},
            {type: 'sit', token, headers: {authorization: 'Bearer consectetur.elipsing.elit'}},
            {type: 'amet', token, headers: {authorization: 'Bearer consectetur.elipsing.elit'}}
        ],
        'One action triggers three new ones, slightly enhanced'
    )

    const strictlyLoremMultiplier = makeMultipliers([
        {shapeyMode: 'strict', type: 'dolor', headers: makeHeaders},
        {shapeyMode: 'strict', type: 'sit', headers: makeHeaders},
        {shapeyMode: 'strict', type: 'amet', headers: makeHeaders}
    ])
    t.deepEqual(
        strictlyLoremMultiplier({type: 'lorem', token}), [
            {type: 'dolor', headers: {authorization: 'Bearer consectetur.elipsing.elit'}},
            {type: 'sit', headers: {authorization: 'Bearer consectetur.elipsing.elit'}},
            {type: 'amet', headers: {authorization: 'Bearer consectetur.elipsing.elit'}}
        ],
        'Shapey "strict" mode is supported in the underlying enhancers, to trim unwanted/unnamed fields from the result'
    )
    t.end()
})

test('basics of action multipliers', (t) => {
    const actions = duck.multipliers[duck.types.POST_LOGIN]({token: 'loremipsumdolorsitamet'})
 
    t.equal(Array.isArray(actions), true, 'data type for the result of action multiplier is Array')
    t.deepEqual(
        actions.map(action => action.type),
        Object.values(duck.types).filter(ty => /GET_(.*)_FORM_ENUMS$/.test(ty)),
        'each item in the array has the expected "type" property'
    )
    t.end()
})

test('extending merges new multipliers with those from the original duck', (t) => {
    const childDuck = extendDuck(duck, {
        types: [
            'CREATE_ORDER_REQUEST',
            'CREATE_ORDER_SUCCESS',
            'CREATE_SHIPMENT_REQUEST',
            'CREATE_SHIPMENT_SUCCESS',
            'PRINT_ORDER_CONFIRMATION'
        ],
        initialState: {
            order: {},
            shipment: {}
        },
        enhancers: ({types, selectors}) => ({
            [types.CREATE_ORDER_SUCCESS]: {order: selectors.getResults},
            [types.CREATE_SHIPMENT_SUCCESS]: {order: selectors.getResults}
        }),
        multipliers: ({types, selectors}) => ({
            [types.CREATE_ORDER_SUCCESS]: {
                shapeyMode: 'strict',
                type: types.PRINT_ORDER_CONFIRMATION,
                order: either(selectors.getResults, prop('order'))
            }
        }),
        reducer(state, action, {types}) {
            switch (action.type) {
                case types.CREATE_ORDER_SUCCESS:
                    return {...state, order: action.order}
                case types.CREATE_SHIPMENT_SUCCESS:
                    return {...state, shipment: action.shipment}
                default:
                  return state
            }
        }
    })
    const order = {
        customerId: 123456789,
        items: [{name: 'Bread'}, {name: 'Flippers'}, {name: 'Feather Polish'}],
        createdAt: new Date()
    }
    const action = {
        type: childDuck.types.CREATE_ORDER_SUCCESS,
        response: {data: {results: {...order}}}
    }
    t.equal(
        Object.keys(childDuck.multipliers).includes(duck.types.POST_LOGIN),
        true,
        'verify child duck contains multipliers from the parent duck'
    )
    t.deepEqual(
        childDuck.multipliers[childDuck.types.CREATE_ORDER_SUCCESS]({
            type: childDuck.types.CREATE_ORDER_SUCCESS,
            response: {
                data: {
                    results: {...order}
                }
            }
        }),
        [{type: childDuck.types.PRINT_ORDER_CONFIRMATION, order}],
        'using the child multiplier'
    )
    t.deepEqual(
        childDuck.multipliers[childDuck.types.POST_LOGIN]({
            type: childDuck.types.POST_LOGIN,
            token: 'number.one.dime'
        }).map(p => p.type),
        [duck.types.GET_ORDER_FORM_ENUMS, duck.types.GET_ORDER_ITEM_FORM_ENUMS, duck.types.GET_SHIPPING_FORM_ENUMS],
        'can access the parent multipliers'
    )
    t.deepEqual(
        childDuck.initialState,
        {enums: {}, order: {}, shipment: {}},
        'inherits the initialState from the parent'
    )
    t.deepEqual(
        childDuck.reducer(
            childDuck.initialState,
            childDuck.enhancers[action.type](action)
        ), {enums: {}, order: {...order}, shipment: {}},
        'enhancer preps the payload for quick simple reduction into the store'
    )
    const shippingEnums = {
        SHIPPERS: ['UPS', 'USPS', 'FedEx', 'DHL', 'etc'],
        COUNTRIES: ['United States', 'Canada', 'Mexico', 'etc'],
        STATES_PROVINCES: ['AL', 'AK', 'AZ', 'etc']
    }
    t.deepEqual(
        childDuck.reducer(
            childDuck.initialState,
            childDuck.enhancers[childDuck.types.GET_SHIPPING_FORM_ENUMS_SUCCESS]({
                type: childDuck.types.GET_SHIPPING_FORM_ENUMS_SUCCESS,
                response: {data: {results: {...shippingEnums}}}
            })
        ), {enums: {SHIPPING: {...shippingEnums}}, order: {}, shipment: {}},
        'using the parent duck reducer and enhancer'
    )
    t.end()
})

test('multipliers can also be a single, standard (not a shaping spec) function', (t) => {
    const childDuck = extendDuck(duck, {
        types: ['PRINT_ORDER_CONFIRMATION', 'CREATE_ORDER_REQUEST', 'CREATE_ORDER_SUCCESS'],
        multipliers: ({types}) => ({
            [types.CREATE_ORDER_SUCCESS]: action => ({
                type: types.PRINT_ORDER_CONFIRMATION,
                orderDescription: action.order.really_ugly_prop_name_for_order_desc
            })
        })
    })
    t.deepEqual(
        childDuck.multipliers[childDuck.types.CREATE_ORDER_SUCCESS]({
            order: {really_ugly_prop_name_for_order_desc: 'A collection of must-haves for the duck on the go'}
        }), [{
            type: childDuck.types.PRINT_ORDER_CONFIRMATION,
            orderDescription: 'A collection of must-haves for the duck on the go'
        }]
    )
    t.end()
})

test('throttling limiter', (t) => {
    t.deepEqual(duck.throttling, [
        [duck.types.POST_LOGIN, 5000],
        [duck.types.GET_ORDER_ITEM_FORM_ENUMS, 5000],
        [new RegExp(/_MESSAGE$/), 500]
    ])
    t.end()
})

test('debouncing limiter', (t) => {
    t.deepEqual(duck.debouncing[1], [new RegExp(/_KEY_PRESS$/), 200])
    t.equal(duck.debouncing[0][0]({api: 'orders'}), true)
    t.end()
})
