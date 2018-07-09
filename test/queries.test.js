import test from 'tape'
import {createDuck, extendDuck} from '../src/duck'

test('lets the queries reference the duck instance', (t) => {
  const duck = createDuck({
    namespace: 'atta',
    store: 'users',
    types: ['FETCH'],
    consts: {baseUrl: 'http://localhost'},
    queries: ({consts}) => ({
      FETCH_USER: [
        url => ({headers: {'Content-Type': 'application/json'}, method: 'GET', url}),
        `${consts.baseUrl}/api/users`
      ]
    })
  })
  t.deepEqual(
    duck.queries, {
      FETCH_USER: {
        url: 'http://localhost/api/users',
        headers: {'Content-Type': 'application/json'},
        method: 'GET'
      }
    }
  )
  t.end()
})

test('extending merges new queries with those from the original duck', (t) => {
  const duck = createDuck({
    namespace: 'a',
    store: 'x',
    types: ['GET'],
    consts: {baseUrl: 'http://localhost'},
    queries: ({consts}) => ({
      get: `${consts.baseUrl}/api/users/`
    })
  })
  const childDuck = extendDuck(duck, {
    types: ['DELETE'],
    queries: ({consts}) => ({
      delete: `${consts.baseUrl}/api/users/:id/delete/`
    })
  })
  t.deepEqual(
    Object.keys(childDuck.queries),
    ['get', 'delete'],
    'verify child duck contains queries from the parent duck'
  )
  t.end()
})

test('lets the child queries access the parent queries', (t) => {
  const d1 = createDuck({
    namespace: 'a',
    store: 'x',
    types: ['FIND'],
    consts: {baseUrl: 'http://localhost'},
    queries: ({consts}) => ({
      find: `${consts.baseUrl}/api/users/:id/`
    })
  })
  const d2 = extendDuck(d1, {
    types: ['DELETE'],
    queries: ({consts}) => ({
      delete: `${consts.baseUrl}/api/users/:id/delete/`
    })
  })
  const d3 = extendDuck(d2, {
    types: ['UPDATE'],
    queries: (duck, parent) => ({
      update: `${parent.find}edit`
    })
  })
  t.deepEqual(d3.queries.update, 'http://localhost/api/users/:id/edit')
  t.end()
})

test('queries are ideal for stories a GraqphQL AST', (t) => {
  const rawQuery = `
        latin {
            lorem
            ipsum
            dolor
            sit
            amet
        }
    `
  const duck = createDuck({queries: {
    USERS: [str => ({document: 'USERS', query: str}), rawQuery]
  }})
  t.deepEqual(duck.queries, {USERS: {document: 'USERS', query: rawQuery}})
  t.end()
})
