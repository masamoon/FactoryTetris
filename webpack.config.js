const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: { loader: 'ts-loader', options: { onlyCompileBundledFiles: true } },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/ui/style.css', to: 'style.css' },
        { from: 'src/asteroid/style.css', to: 'asteroid.css' },
        {
          from: 'node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2',
          to: 'fonts/dm-sans.woff2',
        },
        {
          from: 'node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2',
          to: 'fonts/space-grotesk.woff2',
        },
        {
          from: 'node_modules/@fontsource-variable/dm-sans/LICENSE',
          to: 'fonts/dm-sans-LICENSE.txt',
        },
        {
          from: 'node_modules/@fontsource-variable/space-grotesk/LICENSE',
          to: 'fonts/space-grotesk-LICENSE.txt',
        },
      ],
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 8084,
    hot: true,
    client: {
      logging: 'warn',
      overlay: true,
    },
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
};
