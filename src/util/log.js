import {identity, pipe, toPairs, fromPairs, map} from 'ramda'

const stubLogger = pipe(toPairs, map(([key]) => [key, identity]), fromPairs)(console)

export default (loggingEnabled = true) => (loggingEnabled ? console : stubLogger)
