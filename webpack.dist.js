const webpack = require('webpack')
const merge = require('webpack-merge')
const common = require('./webpack.common.js')
const PACKAGE = require('./package.json')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

module.exports = merge(common, {
  optimization: {
    minimizer: [
      new UglifyJSPlugin({
        include: /\.min\.js$/,
      }),
    ],
  },
  plugins: [
    new webpack.BannerPlugin({
      banner: `yayson v ${PACKAGE.version} (${PACKAGE.homepage}) by ${PACKAGE.author}`,
    }),
  ],
})
