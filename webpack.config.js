const path                      = require('path');
const SpeedMeasurePlugin        = require("speed-measure-webpack-plugin");
const { createProxyMiddleware } = require('http-proxy-middleware');
const webpack                   = require('webpack');
const fs                        = require('fs');
const smp = new SpeedMeasurePlugin();

const pythonServerCert = fs.readFileSync(path.resolve(__dirname, 'src', 'backend', 'hostCert.pem'));
const pythonServerKey  = fs.readFileSync(path.resolve(__dirname, 'src', 'backend', 'hostKey.pem'));

module.exports = smp.wrap({
  entry: './src/frontend/interactive-frontend.js',
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
    server: {
      type: 'https',
      options: {
        key: pythonServerKey, // Private key file
        cert: pythonServerCert, // Certificate file
      },
    },
    setupMiddlewares: function(middlewares, devServer) {
      
      const endpointsOrthanc = ['/dicom-web', '/patients', '/studies', '/series', '/instances']; // List your endpoints here
      endpointsOrthanc.forEach((endpointOrthanc) => {
        devServer.app.use(
          endpointOrthanc,
          createProxyMiddleware({
            target: `http://localhost:8042${endpointOrthanc}`,
            changeOrigin: true,
            onProxyRes: function(proxyRes) {
              proxyRes.headers['Cross-Origin-Opener-Policy'] = 'same-origin';
              proxyRes.headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
            },
          })
        );
      });

      // Add middleware for Python server
      const endpointsPython = ['/prepare', '/process']; // List your endpoints here
      endpointsPython.forEach((endpointPython) => {
        devServer.app.use(
          endpointPython,
          createProxyMiddleware({
            target: `https://localhost:55000${endpointPython}`,
            changeOrigin: false,
            secure: true, // If you want to accept self-signed certificates
            ssl: {
              cert: pythonServerCert,
              key: pythonServerKey, // Private key file
            },
            onProxyReq: (proxyReq, req, res) => {
              // Additional proxy request configurations if needed
            },
          })
        );
      });

      // const endpointsPython = ['/process', '/prepare']; // List your endpoints here
      // endpointsPython.forEach((endpointPython) => {
      //   devServer.app.use(
      //     endpointPython,
      //     createProxyMiddleware({
      //       target: `http://localhost:55000${endpointPython}`,
      //       changeOrigin: true,
      //       onProxyRes: function(proxyRes) {
      //         proxyRes.headers['Cross-Origin-Opener-Policy'] = 'same-origin';
      //         proxyRes.headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
      //       },
      //     })
      //   );
      // });

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

/**
 * 1) Middleware for Orthanc Server
 *  - this server I cant configure, so need to use setupMiddlewares
 * 2) Middleware for Python Server
 *  - this server I can configure via fastapi stuff, so need for middleware
 */