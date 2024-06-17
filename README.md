# Step 1 - To setup
1.  Install node.js using [nvm](https://github.com/nvm-sh/nvm)
    - `nvm install node`
2.  Install Cornerstone3D as show [here](https://www.cornerstonejs.org/docs/getting-started/installation) 
    ```bash
    npm install @cornerstonejs/core
    npm install @cornerstonejs/tools
    npm install @cornerstonejs/streaming-image-volume-loader @cornerstonejs/dicom-image-loader @cornerstonejs/nifti-volume-loader
    npm install @cornerstonejs/calculate-suv
    ```
    - This will add files to the `node_modules` folder and create a `package.json` file
    - Also, consider changing `./node_modules/@icr/polyseg-wasm/dist/index.js`
        - Comment out the line: `import wasm from from './ICRPolySeg.wasm';`
3. Install for development purposes
    - `npm install --save-dev webpack webpack-cli webpack-dev-server`
        - Webpack is a module bundler, webpack-dev-server is a webserver that serves your local .js files
    - `npm install --save-dev speed-measure-webpack-plugin`
4. Install dicom related
    - `npm install dicom-parser`
    - `npm install dcmjs dicomweb-client` # for making requests to the dicom server (e.g. orthanc)
5. Empty files to be manually made
    - `./dist/index.html`
    - `./src/index3DVolume.js`
    - `./webpack.config.js`
6. Install for DICOMWeb purposes
    - `npm install http-proxy-middleware`

# Step 2 - To configure
1. Add the following to `./webpack.config.js`
    ```javascript
    const path = require('path');
    const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
    const smp = new SpeedMeasurePlugin();
    const { createProxyMiddleware } = require('http-proxy-middleware');

    module.exports = smp.wrap({
    entry: './src/index3DVolume.js',
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    // cache: {type: 'filesystem',},
    devtool: 'inline-source-map',
    devServer: {
        static: path.join(__dirname, 'dist'),
        compress: true,
        port: 8081,
        hot: true,
        headers: {
            "Access-Control-Allow-Origin": "*", // not a soln for CORS on orthanc
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",   
            "Cross-Origin-Resource-Policy": "cross-origin",  
        },
        onBeforeSetupMiddleware: function(devServer) { // for CORS on orthanc
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
        }
    }
    
    });
    ```
2. Edit `packages.json` to include:
    ```json
    "scripts": {
        "start": "webpack serve --mode development",
        "build": "webpack --mode production"
    }
    ```
3. Run `npx webpack --mode {development,production} --watch`.
    - This will generate `./dist/main.js`
4. Edit `./dist/index.html`
    ```html
    <body>
        <script src="main.js"></script>
    </body>
    </html>
    ```
4. Include in `./src/index3D.js`
    ```javascript
    import dicomParser from 'dicom-parser';
    import * as cornerstone3D from '@cornerstonejs/core';
    import * as cornerstone3DTools from '@cornerstonejs/tools';
    import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
    import * as cornerstoneStreamingImageLoader from '@cornerstonejs/streaming-image-volume-loader';
    console.log('Hello World!');

    async function setup(){
        cornerstone3D.init()
        cornerstone3DTools.init() 
    }
    setup()
    ```

# Step 3 - To use
1. Type `npm start` in the terminal
    - This refers to `package.json` and runs any scripts defined in it
    - In this case it runs `webpack serve --mode development`

So in total you need two terminals open
    - One for `npm start`
    - One for `npx webpack --mode {development,production} --watch`

# Step 4 - To setup DICOMWeb (Orthanc) server
1. Install Orthanc
    ```bash
    docker pull jodogne/orthanc-plugins`
    docker run -p 8042:8042 -p 8081:8081 -v orthanc-config:/etc/orthanc -v orthanc-db:/var/lib/orthanc/db/ -v node-data:/root jodogne/orthanc-plugins
    ```
    - Other useful commands are `docker ps -a` and to enter the container `docker exec -it <container_id> /bin/bash`

2. Once inside the terminal of the docker container, run
    - Edit `/etc/orthanc.json`
    ```json
    "AuthenticationEnabled" : false,
    ```
    - Make `/etc/dicomweb.json`
    ```json
    {
        "DicomWeb" : 
            { 
                "Enable" : true,         // Whether DICOMweb support is enabled 
                "Root" : "/dicom-web/",  // Root URI of the DICOMweb API (for QIDO-RS, STOW-RS and WADO-RS) 
                "EnableWado" : true,     // Whether WADO-URI (aka. WADO) support is enabled 
                "WadoRoot" : "/wado",    // Root URI of the WADO-URI (aka. WADO) API 
                "Host" : "localhost:8042",    // Hard-codes the name of the host for subsequent WADO-RS requests 
                "Ssl" : false,            // Whether HTTPS should be used for subsequent WADO-RS requests 
                "Servers" : { 
                    "localhost8042" : [ "http://localhost:8042/dicom-web/" ] 
                } 
            } 
    }
    ```
    - Install apt related packages (its a Debian-Linux v10)
    ```bash
    apt-get update
    apt-get install -y curl lsof
    ```
    - Install node. Refer [here](https://github.com/nodesource/distributions?tab=readme-ov-file#using-ubuntu-nodejs-22)
    ```
    curl -fsSL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh
    bash nodesource_setup.sh
    apt-get install -y nodejs
    node -v
    ```
3. Once orthan and node have been setup, stop the container and restart it
    - `docker stop <container_id>` and `docker start <container_id>`
        - Then perform steps [1](#step-1---to-setup) and [2](#step-2---to-configure) and [3](#step-3---to-use) above for the node application.
    - Check if both orthanc and node are running
        - within the container: `lsof -i -P -n`
        - and by visiting `localhost:8081` on your browser 
    - You can also change orthanc's log verbosity by visiting [http://localhost:8042/ui/app/#/settings](http://localhost:8042/ui/app/#/settings)

4. If your docker containeris running as expected, then you can make an image of it
    - `docker commit <container_id> orthanc-node` (will give you a commit id, disregard)
    - `docker tag {commit-ID} {image-name}:{tag}
    - `docker run -p 8042:8042 -p 8081:8081 -v orthanc-config:/etc/orthanc -v orthanc-db:/var/lib/orthanc/db/ -v node-data:/root {image-name}:{tag}` 
    
# For dev purposes
 - Data: 
    - ProstateX
        - `D:\HCAI\Project1-AutoSeg\Code\competitions\medical_dataloader\_data\Pros_ProstateX\_tmp\_tcia\mri\manifest-1600116693422\PROSTATEx\ProstateX-0004\10-18-2011-NA-MR prostaat kanker detectie WDSmc MCAPRODETW-45493\5.000000-t2tsetra-75680`

# Dev terminology
 - WASM: Web Assembly
 - UMD: Universal Module Definition
 - ESM: ECMAScript Module (a modern module format with many advantages over previous formats like CommonJS)
 - WADO: Web Access to DICOM Objects 

# Other community resources
1. Cornerstone3D
    - [for dicom volume loading](https://github.com/cornerstonejs/cornerstone3D/issues/180)
2. Orthanc