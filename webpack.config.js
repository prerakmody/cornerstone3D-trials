const path = require('path');
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const smp = new SpeedMeasurePlugin();
const { createProxyMiddleware } = require('http-proxy-middleware');
const webpack = require('webpack');

module.exports = smp.wrap({
  // entry: './src/index3D.js',
  // entry: './src/index3DVolume.js',
  // entry: './src/index3DContours.js',
  // entry: './src/index3DBrush.js',
  // entry: './src/index3DRTSS.js',
  entry: './src/index3DRTSS-v2.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devtool: 'inline-source-map',
  devServer: {
    static: path.join(__dirname, 'dist'),
    compress: true,
    host: '0.0.0.0', // to allow access from other devices on the same network
    port: 50000,
    // hot: true,
    client: {overlay: false,},
    headers: {
      "Access-Control-Allow-Origin": "*", // not a soln for CORS on orthanc
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",   
      "Cross-Origin-Resource-Policy": "cross-origin",  
    },
    setupMiddlewares: function(middlewares, devServer) {
      
      const endpoints = ['/dicom-web', '/patients', '/studies', '/series', '/instances']; // List your endpoints here
      endpoints.forEach((endpoint) => {
        devServer.app.use(
          endpoint,
          createProxyMiddleware({
            target: `http://localhost:8042${endpoint}`,
            changeOrigin: true,
            onProxyRes: function(proxyRes) {
              proxyRes.headers['Cross-Origin-Opener-Policy'] = 'same-origin';
              proxyRes.headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
            },
          })
        );
      });

      return middlewares;
    },
  },
  experiments: {
    asyncWebAssembly: true,
  },
  module: {
    rules: [
      {
        test: /\.wasm$/,
        use: ['wasm-loader'], //to deal with ERROR in ./node_modules/@icr/polyseg-wasm/dist/ICRPolySeg.wasm 1:0
        type: 'javascript/auto',
      },
    ],
    unknownContextCritical: false,
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NETLIFY': JSON.stringify(process.env.NETLIFY), // to use dicoms from https://d3t6nz73ql33tx.cloudfront.net/dicomweb when on netlify
      'process.env.CONTEXT': JSON.stringify(process.env.CONTEXT),
    })
  ],
});