import dicomParser from 'dicom-parser';
import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstone3DTools from '@cornerstonejs/tools';
import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import * as cornerstoneStreamingImageLoader from '@cornerstonejs/streaming-image-volume-loader';

import createImageIdsAndCacheMetaData from '../helpers/createImageIdsAndCacheMetaData'; // https://github.com/cornerstonejs/cornerstone3D/blob/a4ca4dde651d17e658a4aec5a4e3ec1b274dc580/utils/demo/helpers/createImageIdsAndCacheMetaData.js
import setPetColorMapTransferFunctionForVolumeActor from '../helpers/setPetColorMapTransferFunctionForVolumeActor'; //https://github.com/cornerstonejs/cornerstone3D/blob/v1.77.13/utils/demo/helpers/setPetColorMapTransferFunctionForVolumeActor.js
import setCtTransferFunctionForVolumeActor from '../helpers/setCtTransferFunctionForVolumeActor'; // https://github.com/cornerstonejs/cornerstone3D/blob/v1.77.13/utils/demo/helpers/setCtTransferFunctionForVolumeActor.js

/****************************************************************
*                             VARIABLES  
******************************************************************/

// HTML ids
const contentDivId            = 'contentDiv';
const interactionButtonsDivId = 'interactionButtonsDiv'
const axialID                 = 'Axial';
const sagittalID              = 'Sagittal';
const coronalID               = 'Coronal';
const viewportIds             = [axialID, sagittalID, coronalID];
const viewPortDivId           = 'viewportDiv';
const otherButtonsDivId       = 'otherButtonsDiv';

const contouringButtonDivId           = 'contouringButtonDiv';
const contourSegmentationToolButtonId = 'PlanarFreehandContourSegmentationTool-Button';
const sculptorToolButtonId            = 'SculptorTool-Button';
const noContouringButtonId            = 'NoContouring-Button';

// Tools
const strBrushCircle = 'circularBrush';
const strEraserCircle = 'circularEraser';

// Rendering + Volume + Segmentation ids
const renderingEngineId  = 'myRenderingEngine';
const toolGroupId        = 'STACK_TOOL_GROUP_ID';
const volumeLoaderScheme = 'cornerstoneStreamingImageVolume';
const volumeIdPET        = `${volumeLoaderScheme}:myVolumePET`;
const volumeIdCT         = `${volumeLoaderScheme}:myVolumeCT`;
const segmentationId     = `SEGMENTATION_ID`;

// General
let fusedPETCT   = false;
let volumeCT     = 'none';
let volumePT     = 'none';

/****************************************************************
*                             UTILS  
*****************************************************************/

function getData(){

    let searchObjCT  = {};
    let searchObjPET = {};

    if (process.env.NETLIFY === "true"){

        console.log(' - [getData()] Running on Netlify. Getting data from cloudfront.')
        // CT scan from cornerstone3D samples
        searchObjCT = {
            StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
            SeriesInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561',
            wadoRsRoot: 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
        }
        
        // PET scan from cornerstone3D samples
        searchObjPET = {
            StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
            SeriesInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7009.2403.879445243400782656317561081015',
            wadoRsRoot: 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
        }   
    }
    else {
        console.log(' - [getData()] Running on localhost. Getting data from local orthanc.')

        // ProstateX-004 (MR)  
        // const searchObj = {
        //     StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7311.5101.170561193612723093192571245493',
        //     SeriesInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7311.5101.206828891270520544417996275680',
        //     wadoRsRoot: `${window.location.origin}/dicom-web`,
        //   }
        //// --> (Try in postman) http://localhost:8042/dicom-web/studies/1.3.6.1.4.1.14519.5.2.1.7311.5101.170561193612723093192571245493/series/1.3.6.1.4.1.14519.5.2.1.7311.5101.206828891270520544417996275680/metadata 

        // HCAI-Interactive-XX (PET)
        searchObjPET = {
            StudyInstanceUID: '1.2.752.243.1.1.20240123155004085.1690.65801',
            SeriesInstanceUID:'1.2.752.243.1.1.20240123155004085.1700.14027',
            wadoRsRoot:  `${window.location.origin}/dicom-web`,
        }
        //// --> (Try in postman) http://localhost:8042/dicom-web/studies/1.2.752.243.1.1.20240123155004085.1690.65801/series/1.2.752.243.1.1.20240123155004085.1700.14027/metadata

        // HCAI-Interactive-XX (CT)
        searchObjCT = {
            StudyInstanceUID: '1.2.752.243.1.1.20240123155004085.1690.65801',
            SeriesInstanceUID:'1.2.752.243.1.1.20240123155006526.5320.21561',
            wadoRsRoot:  `${window.location.origin}/dicom-web`,
        }
        //// --> (Try in postman) http://localhost:8042/dicom-web/studies/1.2.752.243.1.1.20240123155004085.1690.65801/series/1.2.752.243.1.1.20240123155004085.1700.14027/metadata
    }

    return {searchObjCT, searchObjPET}
}

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

function showToast(message, duration = 1000) {

    if (message === '') return;
    // Create a new div element
    const toast = document.createElement('div');
  
    // Set the text
    toast.textContent = message;
  
    // Add some styles
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = '#333';
    toast.style.color = '#fff';
    toast.style.padding = '10px';
    toast.style.borderRadius = '5px';
    toast.style.zIndex = '1000';
  
    // Add the toast to the body
    document.body.appendChild(toast);
    
    // After 'duration' milliseconds, remove the toast
    console.log('   -- Toast: ', message);
    setTimeout(() => {
      document.body.removeChild(toast);
    }, duration);
  }

/****************************************************************
*                         HTML ELEMENTS  
*****************************************************************/

function createViewPortsHTML() {

    const contentDiv = document.getElementById(contentDivId);

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

    // Step 1.0 - Get interactionButtonsDiv and contouringButtonDiv
    const interactionButtonsDiv = document.getElementById(interactionButtonsDivId);
    const contouringButtonDiv = document.createElement('div');
    contouringButtonDiv.id = contouringButtonDivId;

    const contouringButtonInnerDiv = document.createElement('div');
    contouringButtonInnerDiv.style.display = 'flex';
    contouringButtonInnerDiv.style.flexDirection = 'row';

    // Step 1.1 - Create a button to enable PlanarFreehandContourSegmentationTool
    const contourSegmentationToolButton = document.createElement('button');
    contourSegmentationToolButton.id = contourSegmentationToolButtonId;
    contourSegmentationToolButton.innerHTML = 'Enable Circle Brush';
    
    // Step 1.2 - Create a button to enable SculptorTool
    const sculptorToolButton = document.createElement('button');
    sculptorToolButton.id = sculptorToolButtonId;
    sculptorToolButton.innerHTML = 'Enable Circle Eraser';
    
    // Step 1.3 - No contouring button
    const noContouringButton = document.createElement('button');
    noContouringButton.id = noContouringButtonId;
    noContouringButton.innerHTML = 'Enable WindowLevelTool';
    
    // Step 1.4 - Add a para
    const para = document.createElement('p');
    para.innerHTML = 'Contouring Tools (use +/- to change brushSize):';
    para.style.margin = '0';

    // Step 1.5 - Add buttons to contouringButtonDiv
    contouringButtonDiv.appendChild(para);
    contouringButtonDiv.appendChild(contouringButtonInnerDiv);
    contouringButtonInnerDiv.appendChild(contourSegmentationToolButton);
    contouringButtonInnerDiv.appendChild(sculptorToolButton);
    contouringButtonInnerDiv.appendChild(noContouringButton);

    // Step 1.6 - Add contouringButtonDiv to contentDiv
    interactionButtonsDiv.appendChild(contouringButtonDiv); 
    
    return {noContouringButton, contourSegmentationToolButton, sculptorToolButton};

}
const {noContouringButton, contourSegmentationToolButton, sculptorToolButton} = createContouringHTML();

function otherHTMLElements(){

    // Step 1.0 - Get interactionButtonsDiv and contouringButtonDiv
    const interactionButtonsDiv = document.getElementById(interactionButtonsDivId);
    const otherButtonsDiv = document.createElement('div');
    otherButtonsDiv.id = otherButtonsDivId;
    otherButtonsDiv.style.display = 'flex';
    otherButtonsDiv.style.flexDirection = 'row';

    // Step 2.0 - Reset view button
    const resetViewButton = document.createElement('button');
    resetViewButton.id = 'resetViewButton';
    resetViewButton.innerHTML = 'Reset View';
    resetViewButton.addEventListener('click', function() {
        const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
        [axialID, sagittalID, coronalID].forEach((viewportId) => {
            const viewportTmp = renderingEngine.getViewport(viewportId);
            viewportTmp.resetCamera();
            viewportTmp.render();
        });
    });

    // Step 3.0 - Show PET button
    const showPETButton = document.createElement('button');
    showPETButton.id = 'showPETButton';
    showPETButton.innerHTML = 'Show PET';
    showPETButton.addEventListener('click', async function() {
        const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
        if (fusedPETCT) {
            [axialID, sagittalID, coronalID].forEach((viewportId) => {
                const viewportTmp = renderingEngine.getViewport(viewportId);
                viewportTmp.removeVolumeActors([volumeIdPET], true);
                fusedPETCT = false;
            });
            setButtonBoundaryColor(this, false);
        }
        else {
            // [axialID, sagittalID, coronalID].forEach((viewportId) => {
            for (const viewportId of viewportIds) {
                const viewportTmp = renderingEngine.getViewport(viewportId);
                await viewportTmp.addVolumes([{ volumeId: volumeIdPET,}], true); // immeditate=true
                fusedPETCT = true;
                viewportTmp.setProperties({ colormap: { name: 'hsv', opacity:0.5 }, voiRange: { upper: 50000, lower: 100, } }, volumeIdPET);
                // viewportTmp.setProperties({ colormap: { name: 'PET 20 Step', opacity:0.5 }, voiRange: { upper: 50000, lower: 100, } }, volumeIdPET);
                // console.log(' -- colormap: ', viewportTmp.getColormap(volumeIdPET), viewportTmp.getColormap(volumeIdCT)); 
            };
            setButtonBoundaryColor(this, true);
        }
    });

    // Step 4.0 - Show hoverelements
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
            const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
            const rect        = viewportDiv.getBoundingClientRect();
            const canvasPos   = [Math.floor(evt.clientX - rect.left),Math.floor(evt.clientY - rect.top),];
            const viewPortTmp = renderingEngine.getViewport(viewportIds[index]);
            const worldPos    = viewPortTmp.canvasToWorld(canvasPos);

            canvasPosHTML.innerText = `Canvas position: (${viewportIds[index]}) - (${canvasPos[0]}, ${canvasPos[1]})`;
            ctValueHTML.innerText = `CT value: ${getValue(volumeCT, worldPos)}`;
            ptValueHTML.innerText = `PT value: ${getValue(volumePT, worldPos)}`;
        });
    });

    mouseHoverDiv.appendChild(canvasPosHTML);
    mouseHoverDiv.appendChild(ctValueHTML);
    mouseHoverDiv.appendChild(ptValueHTML);

    // Step 5 - Create a toast HTML
    const toastHTML = document.createElement('div');
    toastHTML.style.position = 'fixed';
    toastHTML.style.bottom = '20px';
    toastHTML.style.left = '50%';
    toastHTML.style.transform = 'translateX(-50%)';
    toastHTML.style.background = '#333';
    toastHTML.style.color = '#fff';
    toastHTML.style.padding = '10px';
    toastHTML.style.borderRadius = '5px';
    toastHTML.style.zIndex = '1000';
    document.body.appendChild(toastHTML);

    // Step 99 - Add to contentDiv
    otherButtonsDiv.appendChild(resetViewButton);
    otherButtonsDiv.appendChild(showPETButton);
    otherButtonsDiv.appendChild(mouseHoverDiv);
    interactionButtonsDiv.appendChild(otherButtonsDiv);

    return {resetViewButton, showPETButton, toastHTML};
}
const {resetViewButton, showPETButton, toastHTML} = otherHTMLElements();

/****************************************************************
*                      CORNERSTONE FUNCS  
*****************************************************************/

async function cornerstoneInit() {

    cornerstoneDICOMImageLoader.external.cornerstone = cornerstone3D;
    cornerstoneDICOMImageLoader.external.dicomParser = dicomParser;
    cornerstone3D.volumeLoader.registerVolumeLoader('cornerstoneStreamingImageVolume',cornerstoneStreamingImageLoader.cornerstoneStreamingImageVolumeLoader);

    // Step 3.1.2 - Init cornerstone3D and cornerstone3DTools
    await cornerstone3D.init();
}

async function getToolsAndToolGroup() {

    // Step 1 - Init cornerstone3DTools
    await cornerstone3DTools.init();    

    // Step 2 - Get tools
    const windowLevelTool           = cornerstone3DTools.WindowLevelTool;
    const panTool                   = cornerstone3DTools.PanTool;
    const zoomTool                  = cornerstone3DTools.ZoomTool;
    const stackScrollMouseWheelTool = cornerstone3DTools.StackScrollMouseWheelTool;
    const probeTool                 = cornerstone3DTools.ProbeTool;
    const referenceLinesTool        = cornerstone3DTools.ReferenceLines;
    const segmentationDisplayTool   = cornerstone3DTools.SegmentationDisplayTool;
    const brushTool                 = cornerstone3DTools.BrushTool;
    const toolState      = cornerstone3DTools.state;
    const {segmentation} = cornerstone3DTools;

    // Step 3 - init tools
    cornerstone3DTools.addTool(windowLevelTool);
    cornerstone3DTools.addTool(panTool);
    cornerstone3DTools.addTool(zoomTool);
    cornerstone3DTools.addTool(stackScrollMouseWheelTool);
    cornerstone3DTools.addTool(probeTool);
    cornerstone3DTools.addTool(referenceLinesTool);
    cornerstone3DTools.addTool(segmentationDisplayTool);
    cornerstone3DTools.addTool(brushTool);
    
    // Step 4 - Make toolGroup
    const toolGroup = cornerstone3DTools.ToolGroupManager.createToolGroup(toolGroupId);
    toolGroup.addTool(windowLevelTool.toolName);
    toolGroup.addTool(panTool.toolName);
    toolGroup.addTool(zoomTool.toolName);
    toolGroup.addTool(stackScrollMouseWheelTool.toolName);
    toolGroup.addTool(probeTool.toolName);
    toolGroup.addTool(referenceLinesTool.toolName);
    toolGroup.addTool(segmentationDisplayTool.toolName);
    // toolGroup.addTool(brushTool.toolName);
    toolGroup.addToolInstance(strBrushCircle, brushTool.toolName, { activeStrategy: 'FILL_INSIDE_CIRCLE', brushSize:5});
    toolGroup.addToolInstance(strEraserCircle, brushTool.toolName, { activeStrategy: 'ERASE_INSIDE_CIRCLE', brushSize:5});

    // Step 5 - Set toolGroup elements as active/passive
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

    // Step 6 - Setup some event listeners
    // Listen for keydown event
    window.addEventListener('keydown', function(event) {
        // For brush tool radius
        if (event.shiftKey && event.key === '+' || event.key === '+') {
            if (toolGroup.getToolOptions(strBrushCircle).mode == 'Active'){
                let initialBrushSize = toolGroup.getToolConfiguration(strBrushCircle).brushSize;
                toolGroup.setToolConfiguration(strBrushCircle, {brushSize: initialBrushSize += 1});
                let newBrushSize = toolGroup.getToolConfiguration(strBrushCircle).brushSize;
                showToast(`Brush size: ${newBrushSize}`);
            }            
            else if (toolGroup.getToolOptions(strEraserCircle).mode == 'Active'){
                let initialBrushSize = toolGroup.getToolConfiguration(strEraserCircle).brushSize;
                toolGroup.setToolConfiguration(strEraserCircle, {brushSize: initialBrushSize += 1});
                let newBrushSize = toolGroup.getToolConfiguration(strEraserCircle).brushSize;
                showToast(`Brush size: ${newBrushSize}`);
            }
        }

        else if (event.shiftKey && event.key === '-' || event.key === '-') {
            if (toolGroup.getToolOptions(strBrushCircle).mode == 'Active'){
                let initialBrushSize = toolGroup.getToolConfiguration(strBrushCircle).brushSize;
                toolGroup.setToolConfiguration(strBrushCircle, {brushSize: initialBrushSize -= 1});
                let newBrushSize = toolGroup.getToolConfiguration(strBrushCircle).brushSize;
                showToast(`Brush size: ${newBrushSize}`);
            }            
            else if (toolGroup.getToolOptions(strEraserCircle).mode == 'Active'){
                let initialBrushSize = toolGroup.getToolConfiguration(strEraserCircle).brushSize;
                toolGroup.setToolConfiguration(strEraserCircle, {brushSize: initialBrushSize -= 1});
                let newBrushSize = toolGroup.getToolConfiguration(strEraserCircle).brushSize;
                showToast(`Brush size: ${newBrushSize}`);
            }
        }
    });

    return {toolGroup, windowLevelTool, panTool, zoomTool, stackScrollMouseWheelTool, probeTool, referenceLinesTool, segmentation, segmentationDisplayTool, brushTool, toolState};
}

function setContouringButtonsLogic(toolGroup, windowLevelTool){

    // Step 2.3.4 - Add event listeners to buttons        
    [noContouringButton, contourSegmentationToolButton, sculptorToolButton].forEach((buttonHTML, buttonId) => {
        if (buttonHTML === null) return;
        
        buttonHTML.addEventListener('click', function() {
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
            // console.log('   -- brushTool: ', toolState.toolGroups[0].toolOptions[brushTool.toolName]);
        });
    });
}

function getAndSetRenderingEngineAndViewports(toolGroup){

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

    return {renderingEngine};
}

async function loadData(){

    console.log(' \n ----------------- Getting .dcm data ----------------- \n')

    // Step 1 - Get search parameters
    const {searchObjCT, searchObjPET} = getData();
    console.log(' - [loadData()] searchObjCT: ', searchObjCT);

    // Step 2 - Get .dcm data
    const imageIdsCT = await createImageIdsAndCacheMetaData(searchObjCT);
    const imageIdsPET = await createImageIdsAndCacheMetaData(searchObjPET);

    // Step 3 - Create volume
    volumeCT = await cornerstone3D.volumeLoader.createAndCacheVolume(volumeIdCT, { imageIds:imageIdsCT });
    volumeCT.load();
    volumePT = await cornerstone3D.volumeLoader.createAndCacheVolume(volumeIdPET, { imageIds: imageIdsPET });
    volumePT.load();
}

async function fillUpViewports(renderingEngine){

    // Step 1 - Set volumes for viewports
    await cornerstone3D.setVolumesForViewports(renderingEngine,
        // [{ volumeId:volumeIdPET}, { volumeId:volumeIdCT}, ],
        [{ volumeId:volumeIdCT}, ],
         viewportIds);
    
    // Step 2 - Render viewports
    renderingEngine.renderViewports(viewportIds);

}

async function setupSegmentation(segmentation){

    // Step 1 - Create a segmentation volume
    await cornerstone3D.volumeLoader.createAndCacheDerivedSegmentationVolume(volumeIdCT, {volumeId: segmentationId,});

    // Step 2 - Add the segmentation to the state
    segmentation.addSegmentations([
        {segmentationId,
            representation: {
                type: cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap,
                data: { volumeId: segmentationId, },
            },
        },
    ]);

    

    // Step 3 - Set the segmentation representation to the toolGroup
    const segmentationRepresentationUIDs = await segmentation.addSegmentationRepresentations(toolGroupId, [
        {segmentationId, type: cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap,},
    ]);

    segmentation.activeSegmentation.setActiveSegmentationRepresentation(toolGroupId,segmentationRepresentationUIDs[0]);


}

/****************************************************************
*                             MAIN  
*****************************************************************/
async function setup(){

    // -------------------------------------------------> Step 1 - Init
    await cornerstoneInit();
    
    // -------------------------------------------------> Step 2 - Do tooling stuff
    const {toolGroup, windowLevelTool, panTool, zoomTool, stackScrollMouseWheelTool, probeTool, referenceLinesTool, segmentation, segmentationDisplayTool, brushTool, toolState} = await getToolsAndToolGroup();
    setContouringButtonsLogic(toolGroup, windowLevelTool, brushTool, toolState);    

    // -------------------------------------------------> Step 3 - Make rendering engine
    const {renderingEngine} = getAndSetRenderingEngineAndViewports(toolGroup);
    
    // -------------------------------------------------> Step 4 - Get .dcm data
    await loadData()

    // -------------------------------------------------> Step 5 - Fill up viewports
    await fillUpViewports(renderingEngine);

    // -------------------------------------------------> Step 6 - Setup segmentation
    await setupSegmentation(segmentation);

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
    - viewport .setVolumes([{ volumeId, callback: setCtTransferFunctionForVolumeActor }]) .then(() => { viewport.setProperties({ voiRange: { lower: -160, upper: 240 }, VOILUTFunction: Enums.VOILUTFunctionType.LINEAR, colormap: { name: 'Grayscale' }, slabThickness: 0.1, }); });

OTHER NOTES
 - docker run -p 4242:4242 -p 8042:8042 -p 8081:8081 -p 8082:8082 -v tmp:/etc/orthanc -v orthanc-db:/var/lib/orthanc/db/ -v node-data:/root orthanc-plugins-withnode:v1
*/