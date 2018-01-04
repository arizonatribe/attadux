import {createConstants} from '../types'

const {VALIDATION_LEVELS} = createConstants({
    VALIDATION_LEVELS: ['STRICT', 'CANCEL', 'PRUNE', 'LOG']
})

export default VALIDATION_LEVELS
