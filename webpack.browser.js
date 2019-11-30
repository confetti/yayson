const path = require('path')

module.exports = {
  mode: 'production',
  entry: {
    tests: './test/index.js'
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
}
