import dicomParser from 'dicom-parser';
import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstone3DTools from '@cornerstonejs/tools';
import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import * as cornerstoneStreamingImageLoader from '@cornerstonejs/streaming-image-volume-loader';

import createImageIdsAndCacheMetaData from './helpers/createImageIdsAndCacheMetaData'; // https://github.com/cornerstonejs/cornerstone3D/blob/a4ca4dde651d17e658a4aec5a4e3ec1b274dc580/utils/demo/helpers/createImageIdsAndCacheMetaData.js
import setPetColorMapTransferFunctionForVolumeActor from './helpers/setPetColorMapTransferFunctionForVolumeActor'; //https://github.com/cornerstonejs/cornerstone3D/blob/v1.77.13/utils/demo/helpers/setPetColorMapTransferFunctionForVolumeActor.js
import setCtTransferFunctionForVolumeActor from './helpers/setCtTransferFunctionForVolumeActor'; // https://github.com/cornerstonejs/cornerstone3D/blob/v1.77.13/utils/demo/helpers/setCtTransferFunctionForVolumeActor.js

//******************************************* Step 0 - Define Ids (and other configs) */

const axialID    = 'CT_AXIAL_STACK';
const sagittalID = 'CT_SAGITTAL_STACK';
const coronalID  = 'CT_CORONAL_STACK';
const viewportIds = [axialID, sagittalID, coronalID];
const viewPortDivId = 'viewportDiv';

const otherButtonsDivId = 'otherButtonsDiv';

const contouringButtonDivId = 'contouringButtonDiv';
const contourSegmentationToolButtonId = 'PlanarFreehandContourSegmentationTool-Button';
const sculptorToolButtonId = 'SculptorTool-Button';
const noContouringButtonId = 'NoContouring-Button';

const strBrushCircle = 'circularBrush';
const strEraserCircle = 'circularEraser';

const segmentationId = `SEGMENTATION_ID`;
const toolGroupId = 'STACK_TOOL_GROUP_ID';

const renderingEngineId = 'myRenderingEngine';

const volumeLoaderScheme = 'cornerstoneStreamingImageVolume';
const volumeIdPET           = `${volumeLoaderScheme}:myVolumePET`;
const volumeIdCT           = `${volumeLoaderScheme}:myVolumeCT`;

// CT scan from cornerstone3D
// const searchObjCT = {
//     StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
//     SeriesInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561',
//     wadoRsRoot: 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
// }

// const searchObjPET = {
//     StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
//     SeriesInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7009.2403.879445243400782656317561081015',
//     wadoRsRoot: 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
// }

// ProstateX-004 (MR)  
// const searchObj = {
//     StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7311.5101.170561193612723093192571245493',
//     SeriesInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7311.5101.206828891270520544417996275680',
//     wadoRsRoot: `${window.location.origin}/dicom-web`,
//   }
//// --> (Try in postman) http://localhost:8042/dicom-web/studies/1.3.6.1.4.1.14519.5.2.1.7311.5101.170561193612723093192571245493/series/1.3.6.1.4.1.14519.5.2.1.7311.5101.206828891270520544417996275680/metadata 

// HCAI-Interactive-XX (PET)
const searchObjPET = {
    StudyInstanceUID: '1.2.752.243.1.1.20240123155004085.1690.65801',
    SeriesInstanceUID:'1.2.752.243.1.1.20240123155004085.1700.14027',
    wadoRsRoot:  `${window.location.origin}/dicom-web`,
}
//// --> (Try in postman) http://localhost:8042/dicom-web/studies/1.2.752.243.1.1.20240123155004085.1690.65801/series/1.2.752.243.1.1.20240123155004085.1700.14027/metadata

// HCAI-Interactive-XX (CT)
const searchObjCT = {
    StudyInstanceUID: '1.2.752.243.1.1.20240123155004085.1690.65801',
    SeriesInstanceUID:'1.2.752.243.1.1.20240123155006526.5320.21561',
    wadoRsRoot:  `${window.location.origin}/dicom-web`,
}
//// --> (Try in postman) http://localhost:8042/dicom-web/studies/1.2.752.243.1.1.20240123155004085.1690.65801/series/1.2.752.243.1.1.20240123155004085.1700.14027/metadata
let volumeCT = 'none';
let volumePT = 'none';


//******************************************* Step 1 - Make viewport (and other) htmls */

function createViewPortsHTML() {

    const contentDiv = document.getElementById('content');

    const viewportGridDiv = document.createElement('div');
    viewportGridDiv.id = viewPortDivId;
    viewportGridDiv.style.display = 'flex';
    viewportGridDiv.style.flexDirection = 'row';
    viewportGridDiv.oncontextmenu = (e) => e.preventDefault(); // Disable right click

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
const {axialDiv, sagittalDiv, coronalDiv} = createViewPortsHTML();

function createContouringHTML() {

    // Step 1.0 - Get contentDiv and contouringButtonDiv
    const contentDiv = document.getElementById('content');
    const contouringButtonDiv = document.createElement('div');
    contouringButtonDiv.id = contouringButtonDivId;
    contouringButtonDiv.style.display = 'flex';
    contouringButtonDiv.style.flexDirection = 'row';

    // Step 1.1 - Create a button to enable PlanarFreehandContourSegmentationTool
    const contourSegmentationToolButton = document.createElement('button');
    contourSegmentationToolButton.id = contourSegmentationToolButtonId;
    contourSegmentationToolButton.innerHTML = 'Enable PlanarFreehandSegmentationTool';
    
    // Step 1.2 - Create a button to enable SculptorTool
    const sculptorToolButton = document.createElement('button');
    sculptorToolButton.id = sculptorToolButtonId;
    sculptorToolButton.innerHTML = 'Enable SculptorTool';
    
    // Step 1.3 - No contouring button
    const noContouringButton = document.createElement('button');
    noContouringButton.id = noContouringButtonId;
    noContouringButton.innerHTML = 'No Contouring';
    
    // Step 1.3 - Add buttons to contouringButtonDiv
    contouringButtonDiv.appendChild(contourSegmentationToolButton);
    contouringButtonDiv.appendChild(sculptorToolButton);
    contouringButtonDiv.appendChild(noContouringButton);

    // Step 1.4 - Add contouringButtonDiv to contentDiv
    contentDiv.appendChild(contouringButtonDiv); 
    
    return {noContouringButton, contourSegmentationToolButton, sculptorToolButton};

}
const {noContouringButton, contourSegmentationToolButton, sculptorToolButton} = createContouringHTML();

let fusedPETCT = false;
function getValue(volume, worldPos) {
    const { dimensions, scalarData, imageData } = volume;

    const index = imageData.worldToIndex(worldPos);

    index[0] = Math.floor(index[0]);
    index[1] = Math.floor(index[1]);
    index[2] = Math.floor(index[2]);

    if (!cornerstone3D.utilities.indexWithinDimensions(index, dimensions)) {
      return;
    }

    const yMultiple = dimensions[0];
    const zMultiple = dimensions[0] * dimensions[1];

    const value =
      scalarData[index[2] * zMultiple + index[1] * yMultiple + index[0]];

    return value;
}

function otherHTMLElements(){

    // Step 1.0 - Get contentDiv and contouringButtonDiv
    const contentDiv = document.getElementById('content');
    const otherButtonsDiv = document.createElement('div');
    otherButtonsDiv.id = otherButtonsDivId;
    otherButtonsDiv.style.display = 'flex';
    otherButtonsDiv.style.flexDirection = 'row';

    // Step 2.0 - Reset view button
    const resetViewButton = document.createElement('button');
    resetViewButton.id = 'resetViewButton';
    resetViewButton.innerHTML = 'Reset View';
    resetViewButton.addEventListener('click', function() {
        console.log('Resetting view');
        const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
        [axialID, sagittalID, coronalID].forEach((viewportId) => {
            console.log('Resetting view: ', viewportId, renderingEngine.getViewport(viewportId));
            const viewportTmp = renderingEngine.getViewport(viewportId);
            viewportTmp.resetCamera();
            viewportTmp.render();
        });
    });

    // Step 3.0 - Show PET button
    const showPETButton = document.createElement('button');
    showPETButton.id = 'showPETButton';
    showPETButton.innerHTML = 'Show PET';
    showPETButton.addEventListener('click', function() {
        console.log('Showing PET (fusedPETCT: ', fusedPETCT);
        const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
        if (fusedPETCT) {
            [axialID, sagittalID, coronalID].forEach((viewportId) => {
                const viewportTmp = renderingEngine.getViewport(viewportId);
                viewportTmp.removeVolumeActors([volumeIdPET], true);
                fusedPETCT = false;
            });
        }
        else {
            [axialID, sagittalID, coronalID].forEach((viewportId) => {
                const viewportTmp = renderingEngine.getViewport(viewportId);
                // viewportTmp.addVolumes([{ volumeId: volumeIdPET,callback: setPetColorMapTransferFunctionForVolumeActor,}], true);
                viewportTmp.addVolumes([{ volumeId: volumeIdPET,}], true);
                fusedPETCT = true;
            });
        }
    });

    // Show hoverelements
    const mouseHoverDiv = document.createElement('div');
    mouseHoverDiv.id = 'mouseHoverDiv';

    const canvasPosHTML = document.createElement('p');
    const ctValueHTML = document.createElement('p');
    const ptValueHTML = document.createElement('p');
    canvasPosHTML.innerText = 'Canvas position:';
    ctValueHTML.innerText = 'CT value:';
    ptValueHTML.innerText = 'PT value:';

    [axialDiv, sagittalDiv, coronalDiv].forEach((viewportDiv, index) => {
        viewportDiv.addEventListener('mousemove', function(evt) {
            if (volumeCT === 'none' || volumePT === 'none') return;
            console.log(viewportIds[index], volumeCT, volumePT)
            const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
            const rect        = viewportDiv.getBoundingClientRect();
            const canvasPos   = [Math.floor(evt.clientX - rect.left),Math.floor(evt.clientY - rect.top),];
            const viewPortTmp = renderingEngine.getViewport(viewportIds[index]);
            const worldPos    = viewPortTmp.canvasToWorld(canvasPos);

            canvasPosHTML.innerText = `Canvas position: (${canvasPos[0]}, ${canvasPos[1]})`;
            ctValueHTML.innerText = `CT value: ${getValue(volumeCT, worldPos)}`;
            ptValueHTML.innerText = `PT value: ${getValue(volumePT, worldPos)}`;
        });
    });

    mouseHoverDiv.appendChild(canvasPosHTML);
    mouseHoverDiv.appendChild(ctValueHTML);
    mouseHoverDiv.appendChild(ptValueHTML);

    // Step 99 - Add to contentDiv
    otherButtonsDiv.appendChild(resetViewButton);
    otherButtonsDiv.appendChild(showPETButton);
    otherButtonsDiv.appendChild(mouseHoverDiv);
    contentDiv.appendChild(otherButtonsDiv);

    return {resetViewButton, showPETButton};
}

const {resetViewButton, showPETButton} = otherHTMLElements();

function setButtonBoundaryColor(button, shouldSet, color = 'red') {
    if (button instanceof HTMLElement) {
        if (shouldSet) {
            button.style.border = `2px solid ${color}`;
        } else {
            button.style.border = '';
        }
    } else {
        console.error('Provided argument is not a DOM element');
    }
}

//******************************************* Step 2 - Do segmentation stuff */ 
const {segmentation} = cornerstone3DTools;

//******************************************* Step 3 - Do javascript stuff */ 
async function setup(){

    // -------------------------------------------------> Step 3.1 - Init
    // Step 3.1.1 - Init cornerstoneDICOMImageLoader
    cornerstoneDICOMImageLoader.external.cornerstone = cornerstone3D;
    cornerstoneDICOMImageLoader.external.dicomParser = dicomParser;
    cornerstone3D.volumeLoader.registerVolumeLoader('cornerstoneStreamingImageVolume',cornerstoneStreamingImageLoader.cornerstoneStreamingImageVolumeLoader);

    // Step 3.1.2 - Init cornerstone3D and cornerstone3DTools
    await cornerstone3D.init();
    await cornerstone3DTools.init();    

    // -------------------------------------------------> Step 3.2 - Do tooling stuff
    // Step 2.3.1 - Add tools to Cornerstone3D
    const windowLevelTool           = cornerstone3DTools.WindowLevelTool;
    const panTool                   = cornerstone3DTools.PanTool;
    const zoomTool                  = cornerstone3DTools.ZoomTool;
    const stackScrollMouseWheelTool = cornerstone3DTools.StackScrollMouseWheelTool;
    const probeTool                 = cornerstone3DTools.ProbeTool;
    const referenceLinesTool        = cornerstone3DTools.ReferenceLines;
    const segmentationDisplayTool   = cornerstone3DTools.SegmentationDisplayTool;
    const brushTool                 = cornerstone3DTools.BrushTool;
    const toolState = cornerstone3DTools.state;
    
    cornerstone3DTools.addTool(windowLevelTool);
    cornerstone3DTools.addTool(panTool);
    cornerstone3DTools.addTool(zoomTool);
    cornerstone3DTools.addTool(stackScrollMouseWheelTool);
    cornerstone3DTools.addTool(probeTool);
    cornerstone3DTools.addTool(referenceLinesTool);
    cornerstone3DTools.addTool(segmentationDisplayTool);
    cornerstone3DTools.addTool(brushTool);
    
    // Step 2.3.2 - Make toolGroup
    const toolGroup = cornerstone3DTools.ToolGroupManager.createToolGroup(toolGroupId);
    toolGroup.addTool(windowLevelTool.toolName);
    toolGroup.addTool(panTool.toolName);
    toolGroup.addTool(zoomTool.toolName);
    toolGroup.addTool(stackScrollMouseWheelTool.toolName);
    toolGroup.addTool(probeTool.toolName);
    toolGroup.addTool(referenceLinesTool.toolName);
    toolGroup.addTool(segmentationDisplayTool.toolName);
    // toolGroup.addTool(brushTool.toolName);
    toolGroup.addToolInstance(strBrushCircle, brushTool.toolName, { activeStrategy: 'FILL_INSIDE_CIRCLE', });
    toolGroup.addToolInstance(strEraserCircle, brushTool.toolName, { activeStrategy: 'ERASE_INSIDE_CIRCLE', });

    // Step 2.3.3 - Set toolGroup elements as active/passive (after volume has been loaded)
    toolGroup.setToolPassive(windowLevelTool.toolName);// Left Click
    toolGroup.setToolActive(panTool.toolName, {bindings: [{mouseButton: cornerstone3DTools.Enums.MouseBindings.Auxiliary, },],}); // Middle Click
    toolGroup.setToolActive(zoomTool.toolName, {bindings: [{mouseButton: cornerstone3DTools.Enums.MouseBindings.Secondary, },],}); // Right Click    
    toolGroup.setToolActive(stackScrollMouseWheelTool.toolName);
    toolGroup.setToolEnabled(probeTool.toolName);
    toolGroup.setToolEnabled(referenceLinesTool.toolName);
    toolGroup.setToolConfiguration(referenceLinesTool.toolName, {sourceViewportId: axialID,});
    [axialDiv, sagittalDiv, coronalDiv].forEach((viewportDiv, index) => {
        viewportDiv.addEventListener('mouseenter', function() {
            toolGroup.setToolConfiguration(referenceLinesTool.toolName, {sourceViewportId: viewportIds[index]});
        });
    });

    toolGroup.setToolEnabled(segmentationDisplayTool.toolName);
    toolGroup.setToolActive(strBrushCircle, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });    
    
    // Step 2.3.4 - Add event listeners to buttons        
    [noContouringButton, contourSegmentationToolButton, sculptorToolButton].forEach((buttonHTML, buttonId) => {
        if (buttonHTML === null) return;
        
        buttonHTML.addEventListener('click', function(evt) {
            if (buttonId === 0) {
                toolGroup.setToolPassive(strEraserCircle);
                toolGroup.setToolPassive(strBrushCircle);
                toolGroup.setToolActive(windowLevelTool.toolName, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });                    
                setButtonBoundaryColor(noContouringButton, true);
                setButtonBoundaryColor(contourSegmentationToolButton, false);
                setButtonBoundaryColor(sculptorToolButton, false);
            }
            else if (buttonId === 1) {
                toolGroup.setToolPassive(windowLevelTool.toolName);
                toolGroup.setToolPassive(strEraserCircle);
                toolGroup.setToolActive(strBrushCircle, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });    
                setButtonBoundaryColor(noContouringButton, false);
                setButtonBoundaryColor(contourSegmentationToolButton, true);
                setButtonBoundaryColor(sculptorToolButton, false);
            }
            else if (buttonId === 2) {
                toolGroup.setToolPassive(windowLevelTool.toolName);
                toolGroup.setToolPassive(strBrushCircle);
                toolGroup.setToolActive(strEraserCircle, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], }); 
                setButtonBoundaryColor(noContouringButton, false);
                setButtonBoundaryColor(contourSegmentationToolButton, false);
                setButtonBoundaryColor(sculptorToolButton, true);

            }
            console.log('sfadsfadsf: ', buttonId, evt)
            console.log('   -- PlanarFreehandContourSegmentationTool: ', toolState.toolGroups[0].toolOptions[brushTool.toolName]);
        });
    });

    // -------------------------------------------------> Step 2.4 - Make rendering engine
    
    const renderingEngine = new cornerstone3D.RenderingEngine(renderingEngineId);

    // Step 2.5.1 - Add image planes to rendering engine
    const viewportInputs = [
        {element: axialDiv   , viewportId: axialID   , type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.AXIAL},},
        {element: sagittalDiv, viewportId: sagittalID, type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.SAGITTAL},},
        {element: coronalDiv , viewportId: coronalID , type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.CORONAL},},
    ]
    renderingEngine.setViewports(viewportInputs);
    
    // Step 2.5.2 - Add toolGroup to rendering engine
    viewportIds.forEach((viewportId) =>
        toolGroup.addViewport(viewportId, renderingEngineId)
    );
    

    // -------------------------------------------------> Step 2.5 - Get .dcm data
    // const dicomDownloadButton = document.getElementById('dicomDownload')
    // dicomDownloadButton.addEventListener('click', async function() {
        // Step 2.5.1 - Debug
        console.log(' \n ----------------- Getting .dcm data ----------------- \n')

        // Step 2.5.2 - get WADO image Ids
        console.log(' - searchObjCT: ', searchObjCT);
        const imageIdsCT = await createImageIdsAndCacheMetaData(searchObjCT);
        
        // Step 2.5.3 - Create volume
        volumeCT = await cornerstone3D.volumeLoader.createAndCacheVolume(volumeIdCT, { imageIds:imageIdsCT });
        volumeCT.load();
        
        // Step 2.5.4 - Set volume for viewports
        await cornerstone3D.setVolumesForViewports(renderingEngine, [{ volumeId:volumeIdCT, callback: setCtTransferFunctionForVolumeActor }], viewportIds);
        await cornerstone3D.volumeLoader.createAndCacheDerivedSegmentationVolume(volumeIdCT, {
            volumeId: segmentationId,
          });

        ////////////////////////////////////////////////////// Step 2.5.4 - render viewports
        renderingEngine.renderViewports(viewportIds);
        
        //////////////////////// Step 2.5.5 - Deal with segmentations
        // Step 1 - Add the segmentations to state
        segmentation.addSegmentations([
            {segmentationId,
                representation: {
                    type: cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap,
                    data: { volumeId: segmentationId, },
                },
            },
        ]);
        
        // // Step 2 - Create a segmentation representation associated to the toolGroupId
        const segmentationRepresentationUIDs = await segmentation.addSegmentationRepresentations(toolGroupId, [
            {segmentationId, type: cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap,},
        ]);
        
        //////////////////////// Step 2.5.6 - load PET
        const imageIdsPET = await createImageIdsAndCacheMetaData(searchObjPET);
        volumePT = await cornerstone3D.volumeLoader.createAndCacheVolume(volumeIdPET, { imageIds: imageIdsPET });
        volumePT.load();
        
    // })
}


setup()



/**
TO-DO
1. [P] Volume scrolling using left-right arrow
2. [D] Contour making tool (using a select button)
3. [Part D] Contour sculpting tool (using a select button)
4. [P] RTStruct loading tool (from dicomweb)

REFERENCES
 - To change slideId in volumeViewport: https://github.com/cornerstonejs/cornerstone3D/issues/1307
 - More segmentation examples: https://deploy-preview-1205--cornerstone-3d-docs.netlify.app/live-examples/segmentationstack
 - SegmentationDisplayTool is to display the segmentation on the viewport
    - https://github.com/cornerstonejs/cornerstone3D/blob/main/packages/tools/src/tools/displayTools/SegmentationDisplayTool.ts
        - currently only supports LabelMap


OTHER NOTES
 - docker run -p 4242:4242 -p 8042:8042 -p 8081:8081 -p 8082:8082 -v tmp:/etc/orthanc -v orthanc-db:/var/lib/orthanc/db/ -v node-data:/root orthanc-plugins-withnode:v1
*/