const path                      = require('path');
const SpeedMeasurePlugin        = require("speed-measure-webpack-plugin");
const { createProxyMiddleware } = require('http-proxy-middleware');
const webpack                   = require('webpack');
const fs                        = require('fs');
const smp = new SpeedMeasurePlugin();

const pythonServerCert = fs.readFileSync(path.resolve(__dirname, 'src', 'backend', 'hostCert.pem'));
const pythonServerKey  = fs.readFileSync(path.resolve(__dirname, 'src', 'backend', 'hostKey.pem'));

const HOST = '0.0.0.0' // to allow access from other devices on the same network
// const HOST = 'localhost' // to allow access only from the same device
const PORT = 50000

const NODEJS_SERVER_OPTIONS = {type: 'https', options: { key: pythonServerKey, cert: pythonServerCert }}
// const NODEJS_SERVER_OPTIONS = {type: 'http'} // with http, you will get a CORS issue when you access the node server on other networked machines
let SSL_ENABLED = false;
if (NODEJS_SERVER_OPTIONS.type === 'https') {
  SSL_ENABLED = true;
}

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
    host: HOST, 
    port: PORT,
    // hot: true,
    client: {overlay: false,},
    headers: {
      "Access-Control-Allow-Origin": "*", // not a soln for CORS on orthanc
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",   
      "Cross-Origin-Resource-Policy": "cross-origin",  
    },
    server: NODEJS_SERVER_OPTIONS,
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

const os = require('os');
// Function to get the IP address
function getIPAddress() {
  const interfaces = os.networkInterfaces();
  for (let iface in interfaces) {
      for (let alias of interfaces[iface]) {
          if (alias.family === 'IPv4' && !alias.internal) {
              return alias.address;
          }
      }
  }
  return '0.0.0.0';
}

console.log('\n ======================================\n');
console.log(` --> Server running at ${NODEJS_SERVER_OPTIONS.type}://${getIPAddress()}:${PORT}/ (SSL_ENABLED: ${SSL_ENABLED})`);
console.log('   --> Make sure to remove addBlockers! (avoids the net::ERR_BLOCKED_BY_CLIENT issue)')
console.log('   --> Make sure to allow self-signed certificates! (avoids the net::ERR_CERT_AUTHORITY_INVALID issue)')
console.log('   --> Try to set chrome://flags/#allow-insecure-localhost to Enabled !! (avoids the net::ERR_CERT_COMMON_NAME_INVALID issue in Chrome/Edge)')
console.log('\n ======================================\n');

/**
 * 1) Middleware for Orthanc Server
 *  - this server I cant configure, so need to use setupMiddlewares
 * 2) Middleware for Python Server
 *  - this server I can configure via fastapi stuff, so need for middleware
 */