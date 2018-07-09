import {__, curry, is, test as regTest} from 'ramda'
import {isAction, isPlainObj} from '../util/is'

const createDispatchHandler = curry(
  (dispatch, originalAction, nextAction) => {
    if (isAction(nextAction)) {
      if (nextAction.type !== originalAction.type) {
        return dispatch(nextAction)
      }
      return nextAction
    }
    return originalAction
  }
)

export default curry(
  (logger, dispatch, enhancers, action) => {
    const handleDispatch = createDispatchHandler(dispatch, action)
    if (is(Array, enhancers)) {
      const isPatternMatch = regTest(__, action.type)
      enhancers.forEach(([pred, en]) => {
        if (
          (is(RegExp, pred) && isPatternMatch(pred)) ||
          (is(String, pred) && pred === action.type) ||
          (is(Function, pred) && pred(action))
        ) {
          try {
            const nextAction = en(action)
            handleDispatch(nextAction)
          } catch (error) {
            logger.error(`Unable to enhance action: "${action.type}"`, error)
          }
        }
      })
    } else if (isPlainObj(enhancers)) {
      const enhance = enhancers[action.type]
      if (is(Function, enhance)) {
        try {
          const nextAction = enhance(action)
          return handleDispatch(nextAction)
        } catch (error) {
          logger.error(`Unable to enhance action: "${action.type}"`, error)
        }
      }
    }
    return action
  }
)
