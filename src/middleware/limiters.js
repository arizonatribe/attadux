import {compose, filter, has, is, isEmpty, map, path, unnest, values} from 'ramda'

export default (row) => {
    const limiters = {}
    const throttling = compose(unnest, values, map(path(['throttling'])), filter(has('throttling')))(row)
    const debouncing = compose(unnest, values, map(path(['debouncing'])), filter(has('debouncing')))(row)

    if (isEmpty(throttling) && isEmpty(debouncing)) {
        return () => next => action => next(action)
    }
    return () => next => action => {
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
                next(action)
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
                    next(action)
                    delete limiters[action.type]
                }, ms)
            } else {
                next(action)
            }
        }
    }
}
