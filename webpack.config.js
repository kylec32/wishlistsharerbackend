const path = require('path');
const slsw = require('serverless-webpack');
const AddAssetPlugin = require('add-asset-webpack-plugin');
const fs = require('fs');

const entries = {};

Object.keys(slsw.lib.entries).forEach(
  key => (entries[key] = ['./source-map-install.js', slsw.lib.entries[key]])
);

module.exports = {
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  entry: entries,
  devtool: 'source-map',
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
  },
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
  },
  target: 'node',
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      { test: /\.tsx?$/, loader: 'ts-loader' },
    ],
  },
  plugins: [
    new AddAssetPlugin('./keys/private.key', () => { return fs.readFileSync('./keys/private.key') }),
    new AddAssetPlugin('./keys/public.key', () => { return fs.readFileSync('./keys/public.key')})
]
};
