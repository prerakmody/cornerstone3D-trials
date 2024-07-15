import dicomParser from 'dicom-parser';
import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstone3DTools from '@cornerstonejs/tools';
import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import * as cornerstoneStreamingImageLoader from '@cornerstonejs/streaming-image-volume-loader';

import createImageIdsAndCacheMetaData from '../helpers/createImageIdsAndCacheMetaData'; // https://github.com/cornerstonejs/cornerstone3D/blob/a4ca4dde651d17e658a4aec5a4e3ec1b274dc580/utils/demo/helpers/createImageIdsAndCacheMetaData.js


//******************************************* Step 1 - Make viewport htmls */
const axialID    = 'CT_AXIAL_STACK';
const sagittalID = 'CT_SAGITTAL_STACK';
const coronalID  = 'CT_CORONAL_STACK';
const viewportIds = [axialID, sagittalID, coronalID];

function createViewPortsHTML() {
    const contentDiv = document.getElementById('content');

    const viewportGridDiv = document.createElement('div');
    viewportGridDiv.style.display = 'flex';
    viewportGridDiv.style.flexDirection = 'row';
    viewportGridDiv.oncontextmenu = (e) => e.preventDefault();

    // element for axial view
    const axialDiv = document.createElement('div');
    axialDiv.style.width = '500px';
    axialDiv.style.height = '500px';
    axialDiv.id = axialID;

    // element for sagittal view
    const sagittalDiv = document.createElement('div');
    sagittalDiv.style.width = '500px';
    sagittalDiv.style.height = '500px';
    sagittalDiv.id = sagittalID;

    // element for coronal view
    const coronalDiv = document.createElement('div');
    coronalDiv.style.width = '500px';
    coronalDiv.style.height = '500px';
    coronalDiv.id = coronalID;

    viewportGridDiv.appendChild(axialDiv);
    viewportGridDiv.appendChild(sagittalDiv);
    viewportGridDiv.appendChild(coronalDiv);

    contentDiv.appendChild(viewportGridDiv);

    return {contentDiv, viewportGridDiv, axialDiv, sagittalDiv, coronalDiv};
}
const {contentDiv, viewportGridDiv, axialDiv, sagittalDiv, coronalDiv} = createViewPortsHTML();

//******************************************* Step 2 - Do javascript stuff */ 
async function setup(){

    // -------------------------------------------------> Step 2.1 - Init
    // Step 2.1.2 - Init cornerstoneDICOMImageLoader
    cornerstoneDICOMImageLoader.external.cornerstone = cornerstone3D;
    cornerstoneDICOMImageLoader.external.dicomParser = dicomParser;
    cornerstone3D.volumeLoader.registerVolumeLoader('cornerstoneStreamingImageVolume',cornerstoneStreamingImageLoader.cornerstoneStreamingImageVolumeLoader);

    // Step 2.1.1 - Init cornerstone3D and cornerstone3DTools
    await cornerstone3D.init()
    await cornerstone3DTools.init()    

    // -------------------------------------------------> Step 2.2 - Make rendering engine
    const renderingEngineId = 'myRenderingEngine';
    const renderingEngine = new cornerstone3D.RenderingEngine(renderingEngineId);

    // -------------------------------------------------> Step 2.3 - Add image planes to rendering engine
    const viewportInputs = [
        {element: axialDiv   , viewportId: axialID   , type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.AXIAL},},
        {element: sagittalDiv, viewportId: sagittalID, type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.SAGITTAL},},
        {element: coronalDiv , viewportId: coronalID , type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.CORONAL},},
    ]
    renderingEngine.setViewports(viewportInputs);

    // -------------------------------------------------> Step 2.4 - Do tooling stuff
    // Step 2.4.1 - Add tools to Cornerstone3D
    const windowLevelTool = cornerstone3DTools.WindowLevelTool;
    const panTool = cornerstone3DTools.PanTool;
    const zoomTool = cornerstone3DTools.ZoomTool;
    const stackScrollMouseWheelTool = cornerstone3DTools.StackScrollMouseWheelTool;
    const probeTool = cornerstone3DTools.ProbeTool;
    cornerstone3DTools.addTool(windowLevelTool);
    cornerstone3DTools.addTool(panTool);
    cornerstone3DTools.addTool(zoomTool);
    cornerstone3DTools.addTool(stackScrollMouseWheelTool);
    cornerstone3DTools.addTool(probeTool);
    
    // Step 2.4.2 - Make toolGroup
    const toolGroupId = 'STACK_TOOL_GROUP_ID';
    const toolGroup = cornerstone3DTools.ToolGroupManager.createToolGroup(toolGroupId);
    toolGroup.addTool(windowLevelTool.toolName);
    toolGroup.addTool(panTool.toolName);
    toolGroup.addTool(zoomTool.toolName);
    toolGroup.addTool(stackScrollMouseWheelTool.toolName);
    toolGroup.addTool(probeTool.toolName);

    // Step 2.4.3 - Set toolGroup active/passive
    toolGroup.setToolActive(windowLevelTool.toolName, {
        bindings: [{mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, },], // Left Click
    });
    toolGroup.setToolActive(zoomTool.toolName, {
        bindings: [{mouseButton: cornerstone3DTools.Enums.MouseBindings.Secondary, },], // Right Click
    });
    toolGroup.setToolActive(panTool.toolName, {
        bindings: [{mouseButton: cornerstone3DTools.Enums.MouseBindings.Auxiliary, },], // Right Click
    });
    toolGroup.setToolActive(stackScrollMouseWheelTool.toolName);
    toolGroup.setToolPassive(probeTool.toolName);

    // Step 2.4.4 - Add toolGroup to rendering engine
    viewportIds.forEach((viewportId) =>
        toolGroup.addViewport(viewportId, renderingEngineId)
    );

    // -------------------------------------------------> Step 2.5 - Get .dcm data
    const dicomDownloadButton = document.getElementById('dicomDownload')
    dicomDownloadButton.addEventListener('click', async function(e) {
        
        // Step 2.5.1 - Debug
        var tmp = 1

        // Step 2.5.2 - get WADO image Ids
        const imageIds = await createImageIdsAndCacheMetaData({
            StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
            SeriesInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561',
            wadoRsRoot: 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
        });
        console.log(imageIds[0]);
        // https://github.com/OHIF/Viewers/issues/1196
        // const imageIds = await createImageIdsAndCacheMetaData({
        //     StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7311.5101.170561193612723093192571245493',
        //     SeriesInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7311.5101.206828891270520544417996275680',
        //     wadoRsRoot: 'http://127.0.0.1:8042/wado',
        //   });

        console.log(imageIds[0]);
        
        // Step 2.5.3 - Create volume
        const volumeId = 'cornerstoneStreamingImageVolume: myVolume';
        const volume = await cornerstone3D.volumeLoader.createAndCacheVolume(volumeId, { imageIds });
        volume.load();
        cornerstone3D.setVolumesForViewports(
            renderingEngine, [{ volumeId }], viewportIds
        );

        // Step 2.5.3 - render image
        renderingEngine.renderViewports(viewportIds);
    })

}

setup()















/**
DOCS (for cornerstone3D)
1. https://www.cornerstonejs.org/api/tools

2. [D] https://www.cornerstonejs.org/docs/tutorials/basic-stack
3. [D] https://www.cornerstonejs.org/docs/tutorials/basic-volume
*/

/**
EXAMPLES
0. https://www.cornerstonejs.org/docs/examples/#run-examples-locally
    - search for "contour segmentation"
1. https://www.cornerstonejs.org/live-examples/splinecontoursegmentationtools
2. https://github.com/cornerstonejs/cornerstone3D/pull/967
    - for FreehandRoiSculptorTool

Orthanc
- https://orthanc.uclouvain.be/book/users/docker.html (Debian v10 (buster), latest v12)
- https://orthanc.uclouvain.be/book/faq/authentication.html
- https://orthanc.uclouvain.be/book/plugins/dicomweb.html?highlight=%22Servers%22#client-related-options
- docker run -p 4242:4242 -p 8042:8042 --rm -v tmp:/etc/orthanc orthanc-data:/var/lib/orthanc/db/ jodogne/orthanc-plugins
- docker ps -a
- docker run -p 4242:4242 -p 8042:8042 -v tmp:/etc/orthanc -v orthanc-db:/var/lib/orthanc/db/ jodogne/orthanc-plugins
- Upload data and check with Postman: http://localhost:8042/studies
- apt update && apt install tree
- https://orthanc.uclouvain.be/book/faq/same-origin.html
- docker exec -it <containerID> /bin/bash # to enter the container
*/

/**
 apt update
 apt install nodejs npm tree vim
*/

/**
 https://orthanc.uclouvain.be/book/plugins/serve-folders.html#serve-folders
 apt-get install -y curl
 https://github.com/nodesource/distributions#deb
  - curl -fsSL https://deb.nodesource.com/setup_20.8 -o nodesource_setup.sh
*/

/**
 To check ports
   lsof -i -P -n
   docker ps -a
  docker run -p 4242:4242 -p 8042:8042 -p 8081:8081 -d df423222fd9e
  docker commit {containerID} # will give you a commit ID
  docker tag {commit-ID} orthanc-plugins-withnode:v1
  docker run -p 4242:4242 -p 8042:8042 -p 8081:8081 -p 8082:8082 -v tmp:/etc/orthanc -v orthanc-db:/var/lib/orthanc/db/ -v node-data:/root orthanc-plugins-withnode:v1
*/