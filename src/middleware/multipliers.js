import {curry, is, unnest} from 'ramda'
import {isAction} from '../util/is'

export default curry(
    (logger, multipliers, dispatch, action) => {
        multipliers.filter(multiplierMap => multiplierMap[action.type]).forEach(multiplierMap => {
            try {
                const fanout = multiplierMap[action.type]
                const nextActions = fanout(action)
                if (is(Array, nextActions)) {
                    unnest(nextActions)
                        .filter(na => isAction(na) && na.type !== action.type)
                        .forEach(nextAction => {
                            try {
                                dispatch(nextAction)
                            } catch (err) {
                                logger.error(
                                    `Unable to dispatch action: "${nextAction.type}", multiplied from "${action.type}"`,
                                    err
                                )
                            }
                        })
                }
            } catch (error) {
                logger.error(`Unable to multiply action: "${action.type}"`, error)
            }
        })
        return action
    }
)
