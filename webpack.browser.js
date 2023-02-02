const path = require('path')
const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')

module.exports = merge(common, {
  entry: {
    tests: './test/browser.js',
  },
  devtool: 'eval',
  output: {
    path: __dirname + '/test',
    filename: '[name].js',
  },
  performance: {
    maxAssetSize: 3000000,
    maxEntrypointSize: 3000000,
    assetFilter: (asset) => {
      console.log(1212, asset, asset.match('tests.js'))
      return asset.match('tests.js')
    },
  },
  devServer: {
    static: [path.join(__dirname, 'test'), path.join(__dirname, 'dist'), path.join(__dirname, 'node_modules/mocha')],
    compress: true,
    port: 9000,
  },
})
