module.exports = {
  mode: 'production',
  entry: {
    yayson: './src/yayson.js',
    'yayson.min': './src/yayson.js',
    'yayson-legacy': './src/legacy.js',
    'yayson-legacy.min': './src/legacy.js',
  },
  output: {
    path: __dirname + '/dist',
    filename: '[name].js',
    library: 'yayson',
  },
  resolve: {
    fallback: { util: false },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  corejs: '3',
                  useBuiltIns: 'entry',
                },
              ],
            ],
          },
        },
      },
    ],
  },
}
