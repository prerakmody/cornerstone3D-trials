const path = require('path');
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const smp = new SpeedMeasurePlugin();
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = smp.wrap({
  // entry: './src/index3D.js',
  // entry: './src/index3DVolume.js',
  // entry: './src/index3DContours.js',
  entry: './src/index3DBrush.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devtool: 'inline-source-map',
  devServer: {
    static: path.join(__dirname, 'dist'),
    compress: true,
    port: 8080,
    hot: true,
    headers: {
      "Access-Control-Allow-Origin": "*", // not a soln for CORS on orthanc
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",   
      "Cross-Origin-Resource-Policy": "cross-origin",  
    },
    setupMiddlewares: function(middlewares, devServer) {
      devServer.app.use(
        '/dicom-web',
        createProxyMiddleware({
          target: 'http://localhost:8042/dicom-web',
          changeOrigin: true,
          onProxyRes: function(proxyRes) {
            proxyRes.headers['Cross-Origin-Opener-Policy'] = 'same-origin';
            proxyRes.headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
          },
        })
      );
      return middlewares;
    },
  },
});