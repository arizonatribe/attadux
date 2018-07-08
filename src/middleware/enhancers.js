import {curry, is} from 'ramda'
import {isAction} from '../util/is'

export default curry(
  (logger, dispatch, enhancers, action) => {
    const enhance = enhancers[action.type]
    if (is(Function, enhance)) {
      try {
        const nextAction = enhance(action)
        if (isAction(nextAction)) {
          if (nextAction.type !== action.type) {
            dispatch(nextAction)
          } else {
            return nextAction
          }
        }
      } catch (error) {
        logger.error(`Unable to enhance action: "${action.type}"`, error)
      }
    }
    return action
  }
)
