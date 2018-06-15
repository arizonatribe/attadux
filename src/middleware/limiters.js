import {curry, is, isEmpty} from 'ramda'

export default curry(
    (throttling, debouncing, action) => {
        if (isEmpty(throttling) && isEmpty(debouncing)) {
            return Promise.resolve(action)
        }
        const limiters = {}
        return new Promise((resolve) => {
            if (!limiters[action.type]) {
                let ms = 0
                if (throttling.some(([throttleBy, milliseconds]) => {
                    if (
                        (is(String, throttleBy) && throttleBy === action.type) ||
                        (is(RegExp, throttleBy) && throttleBy.test(action.type)) ||
                        (is(Function, throttleBy) && throttleBy(action))
                    ) {
                        ms = milliseconds
                        return true
                    }
                    return false
                })) {
                    resolve(action)
                    limiters[action.type] = setTimeout(() => {
                        delete limiters[action.type]
                    }, ms)
                } else if (debouncing.some(([debounceBy, milliseconds]) => {
                    if (
                        (is(String, debounceBy) && debounceBy === action.type) ||
                        (is(RegExp, debounceBy) && debounceBy.test(action.type)) ||
                        (is(Function, debounceBy) && debounceBy(action))
                    ) {
                        ms = milliseconds
                        return true
                    }
                    return false
                })) {
                    limiters[action.type] = setTimeout(() => {
                        resolve(action)
                        delete limiters[action.type]
                    }, ms)
                } else {
                    resolve(action)
                }
            }
            resolve(action)
        })
    }
)
