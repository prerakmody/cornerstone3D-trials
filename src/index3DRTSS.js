import dicomParser from 'dicom-parser';
import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstone3DTools from '@cornerstonejs/tools';
import * as cornerstoneAdapters from "@cornerstonejs/adapters";
import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import * as cornerstoneStreamingImageLoader from '@cornerstonejs/streaming-image-volume-loader';

import createImageIdsAndCacheMetaData from './helpers/createImageIdsAndCacheMetaData'; // https://github.com/cornerstonejs/cornerstone3D/blob/a4ca4dde651d17e658a4aec5a4e3ec1b274dc580/utils/demo/helpers/createImageIdsAndCacheMetaData.js
import setPetColorMapTransferFunctionForVolumeActor from './helpers/setPetColorMapTransferFunctionForVolumeActor'; //https://github.com/cornerstonejs/cornerstone3D/blob/v1.77.13/utils/demo/helpers/setPetColorMapTransferFunctionForVolumeActor.js
import setCtTransferFunctionForVolumeActor from './helpers/setCtTransferFunctionForVolumeActor'; // https://github.com/cornerstonejs/cornerstone3D/blob/v1.77.13/utils/demo/helpers/setCtTransferFunctionForVolumeActor.js


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
const volumeIdPETBase      = `${volumeLoaderScheme}:myVolumePET`; //+ cornerstone3D.utilities.uuidv4()
const volumeIdCTBase       = `${volumeLoaderScheme}:myVolumeCT`;
let volumeIdCT;
let volumeIdPET;

const segmentationId     = `SEGMENTATION_ID`;

// General
let fusedPETCT   = false;
// let volumeCT     = 'none';
// let volumePT     = 'none';
let petBool      = false;
// let renderingEngine = 'none';

/****************************************************************
*                             UTILS  
*****************************************************************/

function getDataURLs(caseNumber){

    let searchObjCT  = {};
    let searchObjPET = {};
    let searchObjRTS = {};

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
        if (caseNumber == 0){
            searchObjCT = {
                StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7311.5101.170561193612723093192571245493',
                SeriesInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7311.5101.206828891270520544417996275680',
                wadoRsRoot: `${window.location.origin}/dicom-web`,
              }
            // --> (Try in postman) http://localhost:8042/dicom-web/studies/1.3.6.1.4.1.14519.5.2.1.7311.5101.170561193612723093192571245493/series/1.3.6.1.4.1.14519.5.2.1.7311.5101.206828891270520544417996275680/metadata 
            searchObjPET = {}
            searchObjRTS = {}
        }
        // HCAI-Interactive-XX
        else if (caseNumber == 1){
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

            searchObjRTS = {}
        }
        // https://www.cornerstonejs.org/live-examples/segmentationvolume
        else if (caseNumber == 2){
            searchObjCT = {
                StudyInstanceUID:"1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458",
                SeriesInstanceUID:"1.3.6.1.4.1.14519.5.2.1.40445112212390159711541259681923198035",
                wadoRsRoot: "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
            },
            searchObjPET = {
            }
            searchObjRTS = {
                StudyInstanceUID:"1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458",
                SeriesInstanceUID:"1.2.276.0.7230010.3.1.3.481034752.2667.1663086918.611582",
                SOPInstanceUID:"1.2.276.0.7230010.3.1.4.481034752.2667.1663086918.611583",
            }
        }  
        
    }

    return {searchObjCT, searchObjPET, searchObjRTS};
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

function getSegmentationIds() {
    return cornerstone3DTools.segmentation.state.getSegmentations().map(x => x.segmentationId);
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
        if (petBool){
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
        }else{
            showToast('No PET data available')
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
            const volumeCTThis = cornerstone3D.cache.getVolume(volumeIdCT);
            const volumePTThis = cornerstone3D.cache.getVolume(volumeIdPET);
            if (volumeCTThis == undefined && volumePTThis == undefined) return;
            const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
            const rect        = viewportDiv.getBoundingClientRect();
            const canvasPos   = [Math.floor(evt.clientX - rect.left),Math.floor(evt.clientY - rect.top),];
            const viewPortTmp = renderingEngine.getViewport(viewportIds[index]);
            const worldPos    = viewPortTmp.canvasToWorld(canvasPos);

            canvasPosHTML.innerText = `Canvas position: (${viewportIds[index]}) => (${canvasPos[0]}, ${canvasPos[1]})`;
            ctValueHTML.innerText = `CT value: ${getValue(volumeCTThis, worldPos)}`;
            if (petBool){ptValueHTML.innerText = `PT value: ${getValue(volumePTThis, worldPos)}`;}
            
        });
    });

    mouseHoverDiv.appendChild(canvasPosHTML);
    mouseHoverDiv.appendChild(ctValueHTML);
    mouseHoverDiv.appendChild(ptValueHTML);

    // Step 5 - Create dropdown for case selection
    const caseSelection = document.createElement('select');
    caseSelection.id        = 'caseSelection';
    caseSelection.innerHTML = 'Case Selection';
    const cases = ['ProstateX-004', 'HCAI-Interactive-XX', 'SegmentationVolume'];
    cases.forEach((caseName, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.text = caseName;
        caseSelection.appendChild(option);
    });
    caseSelection.addEventListener('change', async function() {
        const caseNumber = parseInt(this.value);
        console.log('   -- caseNumber: ', caseNumber);
        const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
        await fetchAndLoadData(caseNumber, renderingEngine, [volumeIdCT]);
    });

    // Step 99 - Add to contentDiv
    otherButtonsDiv.appendChild(caseSelection);
    otherButtonsDiv.appendChild(resetViewButton);
    otherButtonsDiv.appendChild(showPETButton);
    otherButtonsDiv.appendChild(mouseHoverDiv);
    interactionButtonsDiv.appendChild(otherButtonsDiv);

    return {resetViewButton, showPETButton};
}
const {resetViewButton, showPETButton} = otherHTMLElements();

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

async function fetchAndLoadData(caseNumber, renderingEngine){

    console.log(' \n ----------------- Getting .dcm data ----------------- \n')
    restart();

    // Step 1 - Get search parameters
    const {searchObjCT, searchObjPET, searchObjRTS} = getDataURLs(caseNumber);
    console.log(' - [loadData()] searchObjCT: ', searchObjCT);

    // Step 2.1 - Create volume for CT
    volumeIdCT       = volumeIdCTBase + cornerstone3D.utilities.uuidv4();
    const imageIdsCT = await createImageIdsAndCacheMetaData(searchObjCT);
    const volumeCT   = await cornerstone3D.volumeLoader.createAndCacheVolume(volumeIdCT, { imageIds:imageIdsCT });
    volumeCT.load();

    // Step 2.2 - Create volume for PET
    volumeIdPET = 'none';
    petBool = false;
    if (Object.keys(searchObjPET).length > 0){
        volumeIdPET       = volumeIdPETBase + cornerstone3D.utilities.uuidv4();
        const imageIdsPET = await createImageIdsAndCacheMetaData(searchObjPET);
        const volumePT    = await cornerstone3D.volumeLoader.createAndCacheVolume(volumeIdPET, { imageIds: imageIdsPET });
        volumePT.load();
        petBool = true;
    }

    // Step 3 - Set volumes for viewports
    await cornerstone3D.setVolumesForViewports(renderingEngine, [{ volumeId:volumeIdCT}, ], viewportIds, true);
    
    // Step 4 - Render viewports
    renderingEngine.renderViewports(viewportIds);

    // Step 5 - setupSegmentation
    await setupSegmentation();
}

function restart() {
    
    // Step 1 - Clear cache (images and volumes)
    cornerstone3D.cache.purgeCache(); // cornerstone3D.cache.getVolumes(), cornerstone3D.cache.getCacheSize()
    
    // Step 2 - Remove segmentations from toolGroup
    cornerstone3DTools.segmentation.removeSegmentationsFromToolGroup(toolGroupId);

    // Step 3 - Remove segmentations from state
    const segmentationIds = getSegmentationIds();
    segmentationIds.forEach(segmentationId => {
        cornerstone3DTools.segmentation.state.removeSegmentation(segmentationId);
    });
}

async function fillUpViewports(renderingEngine, volumeIds){

    // Step 1 - Set volumes for viewports
    await cornerstone3D.setVolumesForViewports(renderingEngine,
        volumeIds.map(volumeId_ => ({ volumeId:volumeId_ })),
        viewportIds);
    
    // Step 2 - Render viewports
    renderingEngine.renderViewports(viewportIds);

}

async function setupSegmentation(){

    // Step 1 - Create a segmentation volume
    await cornerstone3D.volumeLoader.createAndCacheDerivedSegmentationVolume(volumeIdCT, {volumeId: segmentationId,});

    // Step 2 - Add the segmentation to the state
    cornerstone3DTools.segmentation.addSegmentations([
        {segmentationId,
            representation: {
                type: cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap,
                data: { volumeId: segmentationId, },
            },
        },
    ]);

    // Step 3 - Set the segmentation representation to the toolGroup
    await cornerstone3DTools.segmentation.addSegmentationRepresentations(toolGroupId, [
        {segmentationId, type: cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap,},
    ]);

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
    await fetchAndLoadData(0, renderingEngine);

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