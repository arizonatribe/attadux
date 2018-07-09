import {curry} from 'ramda'
import {isPromise, isAction} from '../util/is'

export const resultHandler = curry(
  (dispatch, action, result) => {
    if (isAction(result) && action.type !== result.type) {
      dispatch(result)
    }
  }
)

export default curry(
  (logger, effects, dispatch, action) => {
    const handleResult = resultHandler(dispatch, action)
    effects.forEach(effect => {
      const result = effect(action)
      if (isPromise(result)) {
        result.then(handleResult)
      } else {
        handleResult(result)
      }
    })
    return action
  }
)
