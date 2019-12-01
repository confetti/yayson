const path = require('path')
const merge = require('webpack-merge')
const common = require('./webpack.common.js')

module.exports = merge(common, {
  mode: 'production',
  entry: {
    tests: './test/browser.js'
  },
  output: {
    path: __dirname + '/test',
    filename: '[name].js'
  },
  devServer: {
    contentBase: [
      path.join(__dirname, 'test'),
      path.join(__dirname, 'dist'),
      path.join(__dirname, 'node_modules/mocha')
    ],
    compress: true,
    port: 9000
  }
})
