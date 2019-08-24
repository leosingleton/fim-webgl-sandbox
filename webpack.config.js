const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

var config = {
  mode: 'development',
  entry: './src/index.ts',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.glsl$/,
        use: 'webpack-glsl-minify'
      }
    ]
  },
  resolve: {
    extensions: [ '.glsl', '.ts' ]
  },
  plugins: [
    new CopyWebpackPlugin([
      {
        context: './static/',
        from: '**/*'
      },
      {
        context: './node_modules/bootstrap/dist/css/',
        from: 'bootstrap.min.css'
      }
    ])
  ],
  output: {
    path: path.resolve(__dirname, './build/samples'),
    filename: 'samples.js',
    library: 'Samples'
  }
};

module.exports = config;
