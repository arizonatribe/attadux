/* eslint "no-console": "off" */
import chalk from 'chalk'
import {curry, test, is, length} from 'ramda'
import util from 'util'

/* General helpers used in the unit tests */
export const isString = is(String)
export const isNumber = is(Number)
export const isOldEnough = val => isNumber(val) && val > 12
export const isYoungEnough = val => isNumber(val) && val < 112
export const isValidEmail = test(/[^\\.\\s@:][^\\s@:]*(?!\\.)@[^\\.\\s@]+(?:\\.[^\\.\\s@]+)*/)
export const isLongerThan = len => isNumber(len) && len > 0 && (str => isString(str) && length(str) > len)
export const isShorterThan = len => isNumber(len) && len > 0 && (str => isString(str) && length(str) < len)

/* A stylized logger */
export default curry((caption, message) => console.error(chalk`
{bold.white ${Array(caption.length + 4).fill('-').join('')}}
  {bold.yellow ${caption}}
  {bold.red ${util.format('%o', message)}}
{bold.white ${Array(caption.length + 4).fill('-').join('')}}
`))
