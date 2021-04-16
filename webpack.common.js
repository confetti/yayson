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
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
}
