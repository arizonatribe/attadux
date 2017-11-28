/* eslint "no-console": "off" */
import chalk from 'chalk'
import util from 'util'

export default (caption, message) => console.error(chalk`
{bold.white ${Array(caption.length + 4).fill('-').join('')}}
  {bold.yellow ${caption}}
  {bold.red ${util.format('%o', message)}}
{bold.white ${Array(caption.length + 4).fill('-').join('')}}
`)
