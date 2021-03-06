import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'
import replace from 'rollup-plugin-replace'
import uglify from 'rollup-plugin-uglify'
import {minify} from 'uglify-es'

const env = process.env.NODE_ENV
const config = {
  input: 'lib/index.js',
  plugins: [nodeResolve({jsnext: true})]
}

if (env === 'es' || env === 'cjs') {
  config.output = {format: env, indent: false, exports: 'named'}
  config.external = ['ramda', 'shapey', 'spected', 'workerize']
  config.plugins.push(
    babel({
      plugins: ['external-helpers']
    })
  )
}

if (env === 'development' || env === 'production') {
  config.output = {format: 'umd', name: 'ruddy', indent: false, exports: 'named'}
  config.plugins.push(
    commonjs({
      include: [
        'node_modules/ramda/**',
        'node_modules/shapey/**',
        'node_modules/spected/**',
        'node_modules/workerize/**'
      ]
    }),
    babel({
      exclude: 'node_modules/**',
      plugins: ['external-helpers']
    }),
    replace({'process.env.NODE_ENV': JSON.stringify(env)})
  )
}

if (env === 'production') {
  config.plugins.push(
    uglify({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        warnings: false
      }
    }, minify)
  )
}

export default config
