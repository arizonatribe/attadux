/* eslint "max-len": "off" */
import test from 'tape-promise/tape'
import {always, pathEq, pathOr} from 'ramda'
import {createDuck} from '../src'
import {makeEffectHandler, defaultErrorHandler, defaultSuccessHandler, makePredicate} from '../src/effects'

const users = [{id: 1, name: 'Harry Potter'}, {id: 2, name: 'Ron Weasley'}, {id: 3, name: 'Hermione Granger'}]

test('"defaultErrorHandler"', (t) => {
  t.deepEqual(
    defaultErrorHandler('Aaaah! You broke it!', {type: 'FETCH_USERS_REQUEST'}),
    {type: 'FETCH_USERS_ERROR', error: 'Aaaah! You broke it!'},
    'handles an error string'
  )
  t.deepEqual(
    defaultErrorHandler({status: 500, message: 'Aaaah! You broke it!'}, {type: 'FETCH_USERS_REQUEST'}),
    {type: 'FETCH_USERS_ERROR', error: {message: 'Aaaah! You broke it!', status: 500}},
    'handles an error object'
  )
  t.deepEqual(
    defaultErrorHandler('Aaaah! You broke it!')({type: 'FETCH_USERS_REQUEST'}),
    {type: 'FETCH_USERS_ERROR', error: 'Aaaah! You broke it!'},
    'is curried'
  )
  t.end()
})

test('"defaultSuccessHandler"', (t) => {
  t.deepEqual(
    defaultSuccessHandler('You\'re amazing; don\'t let it go to your head though.', {type: 'FETCH_USERS_REQUEST'}),
    {type: 'FETCH_USERS_SUCCESS', payload: 'You\'re amazing; don\'t let it go to your head though.'},
    'handles a string returned from the effect function'
  )
  t.deepEqual(
    defaultSuccessHandler({users}, {type: 'FETCH_USERS_REQUEST'}),
    {type: 'FETCH_USERS_SUCCESS', users},
    'handles the effect\'s return object'
  )
  t.deepEqual(
    defaultSuccessHandler('You\'re amazing; don\'t let it go to your head though.')({type: 'FETCH_USERS_REQUEST'}),
    {type: 'FETCH_USERS_SUCCESS', payload: 'You\'re amazing; don\'t let it go to your head though.'},
    'is curried'
  )
  t.end()
})

test('"makePredicate"', (t) => {
  t.equal(typeof makePredicate(null), 'function', 'always creates a function')
  t.equal(
    makePredicate(/_REQUEST$/i)({type: 'FETCH_USERS_REQUEST'}),
    true,
    'when providing a regex, is applied to a "type" property'
  )
  t.equal(
    makePredicate(/_REQUEST$/i)({type: 'TOGGLE_DRAWER'}),
    false,
    'correctly evaluates an action fails to match the regex predicate'
  )
  t.equal(
    makePredicate('SUCCESSFUL_LOGIN')({type: 'SUCCESSFUL_LOGIN'}),
    true,
    'when providing a string, it is applied to a "type" property'
  )
  t.equal(
    makePredicate('SUCCESSFUL_LOGIN')({type: 'FETCH_USERS_REQUEST'}),
    false,
    'correctly evaluates an action fails to match the string predicate'
  )
  t.equal(
    makePredicate(pathEq(['meta', 'worker'], true))({type: 'FETCH_USERS_REQUEST', meta: {worker: true}}),
    true,
    'when providing a function, it is applied to the ENTIRE action'
  )
  t.equal(
    makePredicate(pathEq(['meta', 'worker'], true))({type: 'FETCH_USERS_REQUEST'}),
    false,
    'correctly evaluates an action fails to match the predicate function'
  )
  t.equal(
    makePredicate(always(undefined))({type: 'FETCH_USERS_REQUEST'}),
    false,
    'if being careless (or overly clever) and the function doesn\'t return a Boolean, the result is still coerced to Boolean'
  )
  t.equal(
    makePredicate(42)({type: 'FETCH_USERS_REQUEST'}),
    false,
    'always returns false when predicate is numeric . . . for some unfathomable reason'
  )
  t.equal(
    makePredicate(null)({type: 'FETCH_USERS_REQUEST'}),
    false,
    'always returns false when predicate is null'
  )
  t.end()
})

test('"makeEffectHandler"', (t) => {
  function sloppyEffect(action) {
    return {
      meta: {
        ...action.meta,
        config: {
          ...action.meta.config,
          method: 'get',
          url: 'http://localhost/users',
          headers: {
            'content-type': 'application/json'
          }
        }
      }
    }
  }
  const handleRequest = makeEffectHandler([/_EFFECT/i, sloppyEffect, defaultSuccessHandler, defaultErrorHandler])
  t.deepEqual(
    handleRequest({type: 'FORMAT_USER_FETCH_EFFECT'}),
    {type: 'FORMAT_USER_FETCH_ERROR', error: 'TypeError: Cannot read property \'config\' of undefined'},
    'error is caught'
  )
  t.deepEqual(
    handleRequest({type: 'FORMAT_USER_FETCH_EFFECT', meta: {worker: true}}), {
      type: 'FORMAT_USER_FETCH_SUCCESS',
      meta: {
        worker: true,
        config: {
          method: 'get',
          url: 'http://localhost/users',
          headers: {'content-type': 'application/json'}
        }
      }
    },
    'successfully applied effect'
  )
  t.end()
})

test('effects', async (t) => {
  const mockFetch = () => Promise.resolve({users})
  const duck = createDuck({
    namespace: 'myApp',
    store: 'users',
    consts: {
      metaDefaluts: {
        method: 'get',
        url: 'http://localhost/api',
        headers: {'content-type': 'application/json'}
      }
    },
    types: [
      'FETCH_USER_REQUEST',
      'FETCH_USER_ERROR',
      'FETCH_USER_SUCCESS',
      'FETCH_USERS_REQUEST',
      'FETCH_USERS_ERROR',
      'FETCH_USERS_SUCCESS'
    ],
    initialState: {
      users: {}
    },
    effects: ({types}) => [
      [/REQUEST$/i, ({meta}) => mockFetch(meta.url, meta)],
      [types.FETCH_USERS_REQUEST, ({meta}) => mockFetch(meta.url, meta)],
      [types.FETCH_USERS_REQUEST, ({meta}) => mockFetch(meta.url, meta), {
        shapeyMode: 'strict',
        results: pathOr([], ['users']),
        type: types.FETCH_USERS_SUCCESS
      }], [
        types.FETCH_USER_REQUEST,
        () => Promise.reject('You are not allowed to view that user'),
        null,
        (error, action) => ({
          error: String(error),
          id: action.id,
          type: types.FETCH_USER_ERROR
        })
      ],
      [types.FETCH_USERS_REQUEST, ({meta}) => mockFetch(meta.url, meta), types.FETCH_USERS_SUCCESS, types.FETCH_USERS_ERROR]
    ],
    creators: ({types, consts}) => ({
      fetchUsers: () => ({
        type: types.FETCH_USERS_REQUEST,
        meta: {
          ...consts.metaDefaluts,
          url: `${consts.metaDefaluts.url}/users`
        }
      }),
      fetchUser: id => ({
        id,
        type: types.FETCH_USER_REQUEST,
        meta: {
          ...consts.metaDefaluts,
          url: `${consts.metaDefaluts.url}/users/${id}`
        }
      })
    })
  })
  t.deepEqual(
    duck.effects[0]({type: duck.types.FETCH_USERS_REQUEST}),
    {type: duck.types.FETCH_USERS_ERROR, error: 'TypeError: Cannot read property \'url\' of undefined'},
    'catches an error'
  )
  const fetchResultByPattern = await duck.effects[0](duck.creators.fetchUsers())
  t.deepEqual(
    fetchResultByPattern,
    {type: duck.types.FETCH_USERS_SUCCESS, users},
    'simple regex pattern matching on action type (with default success/error handlers)'
  )
  const fetchResultByExactMatch = await duck.effects[1](duck.creators.fetchUsers())
  t.deepEqual(
    fetchResultByExactMatch,
    {type: duck.types.FETCH_USERS_SUCCESS, users},
    'exact string matching of action type (with default success/error handlers)'
  )
  const fetchResultWithCustomSuccessHandler = await duck.effects[2](duck.creators.fetchUsers())
  t.deepEqual(
    fetchResultWithCustomSuccessHandler,
    {type: duck.types.FETCH_USERS_SUCCESS, results: users},
    'overriding the default success handler with a spec mapping function'
  )
  const fetchResultWithCustomErrorHandler = await duck.effects[3](duck.creators.fetchUser(42))
  t.deepEqual(
    fetchResultWithCustomErrorHandler,
    {type: duck.types.FETCH_USER_ERROR, error: 'You are not allowed to view that user', id: 42},
    'overriding the default error handler with a custom function'
  )
  const fetchResultSimpleActionTypeResponses = await duck.effects[4](duck.creators.fetchUsers())
  t.deepEqual(
    fetchResultSimpleActionTypeResponses,
    {type: duck.types.FETCH_USERS_SUCCESS, users},
    'wickedly simply shorthand for success/error response handling'
  )
  t.end()
})
