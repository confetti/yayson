const webpack = require('webpack'),
  PACKAGE = require('./package.json'),
  UglifyJSPlugin = require('uglifyjs-webpack-plugin')

module.exports = {
  mode: 'production',
  entry: {
    yayson: './src/yayson.js',
    'yayson.min': './src/yayson.js'
  },
  output: {
    path: __dirname + '/dist',
    filename: '[name].js',
    library: 'yayson'
  },
  devServer: {
    inline: true
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  optimization: {
    minimizer: [
      new UglifyJSPlugin({
        include: /\.min\.js$/
      })
    ]
  },
  plugins: [
    new webpack.BannerPlugin({
      banner: `yayson v ${PACKAGE.version} (${PACKAGE.homepage}) by ${PACKAGE.author}`
    })
  ]
}
