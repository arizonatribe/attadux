import test from 'tape'
import {objOf} from 'ramda'

const huey = {
  store: 'huey',
  namespace: 'adx',
  types: {
    LOREM: 'LOREM',
    IPSUM: 'IPSUM',
    DOLOR: 'SIT',
    AMET: 'AMET'
  },
  reducer: (state, action, {types}) => {
    switch (action.type) {
      case types.LOREM:
        return {
          abbrev: 'LRM',
          fullName: 'Leonard Lorem',
          age: 11
        }
      case types.IPSUM:
        return {
          abbrev: 'IPS',
          fullName: 'Isaiah Ipsum',
          age: 14
        }
      case types.SIT:
        return {
          abbrev: 'SIT',
          fullName: 'Sylvester Sit',
          age: 18
        }
      case types.AMET:
        return {
          abbrev: 'AMT',
          fullName: 'Amanda Amet',
          age: 23
        }
      default:
        return state
    }
  }
}

test('applicative functor testing', (t) => {
    t.deepEqual(
        objOf('huey', huey),
        {huey},
        'what is inside of a functor of()'
    )
    t.end()
})
