import dcmjs, { data } from 'dcmjs';
import dicomParser from 'dicom-parser';
import * as dicomWebClient from "dicomweb-client";

import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstone3DTools from '@cornerstonejs/tools';
import * as cornerstoneAdapters from "@cornerstonejs/adapters";
import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import * as cornerstoneStreamingImageLoader from '@cornerstonejs/streaming-image-volume-loader';

import createImageIdsAndCacheMetaData from './helpers/createImageIdsAndCacheMetaData'; // https://github.com/cornerstonejs/cornerstone3D/blob/a4ca4dde651d17e658a4aec5a4e3ec1b274dc580/utils/demo/helpers/createImageIdsAndCacheMetaData.js
// import setPetColorMapTransferFunctionForVolumeActor from './helpers/setPetColorMapTransferFunctionForVolumeActor'; //https://github.com/cornerstonejs/cornerstone3D/blob/v1.77.13/utils/demo/helpers/setPetColorMapTransferFunctionForVolumeActor.js
// import setCtTransferFunctionForVolumeActor from './helpers/setCtTransferFunctionForVolumeActor'; // https://github.com/cornerstonejs/cornerstone3D/blob/v1.77.13/utils/demo/helpers/setCtTransferFunctionForVolumeActor.js

import * as dockerNames from 'docker-names'
import { vec3 } from 'gl-matrix';
// import * as fs from 'fs'
// import * as https from 'https'
// import os from 'os'; // Module not found: Error: Can't resolve 'os' in '/Users/prerakmody/Documents/Work/HCAI/Code/Project3-InteractiveRefinement/visualizer/src/frontend'

const instanceName = dockerNames.getRandomName()
console.log(' ------------ instanceName: ', instanceName)


/****************************************************************
*                             VARIABLES  
******************************************************************/

// HTML ids
const contentDivId            = 'contentDiv';
const interactionButtonsDivId = 'interactionButtonsDiv'
const axialID                 = 'ViewPortId-Axial';
const sagittalID              = 'ViewPortId-Sagittal';
const coronalID               = 'ViewPortId-Coronal';
const viewportIds             = [axialID, sagittalID, coronalID];
const viewPortDivId           = 'viewportDiv';
const otherButtonsDivId       = 'otherButtonsDiv';

const contouringButtonDivId           = 'contouringButtonDiv';
const contourSegmentationToolButtonId = 'PlanarFreehandContourSegmentationTool-Button';
const sculptorToolButtonId            = 'SculptorTool-Button';
const windowLevelButtonId             = 'WindowLevelTool-Button';

// Tools
const strBrushCircle = 'circularBrush';
const strEraserCircle = 'circularEraser';

// Rendering + Volume + Segmentation ids
const renderingEngineId        = 'myRenderingEngine';
const toolGroupIdContours      = 'MY_TOOL_GROUP_ID_CONTOURS';
const toolGroupIdScribble      = 'MY_TOOL_GROUP_ID_SCRIBBLE'; // not in use, failed experiment: Multiple tool groups found for renderingEngineId: myRenderingEngine and viewportId: ViewPortId-Axial. You should only have one tool group per viewport in a renderingEngine.
const toolGroupIdAll           = [toolGroupIdContours, toolGroupIdScribble];
const volumeLoaderScheme       = 'cornerstoneStreamingImageVolume';
const volumeIdPETBase      = `${volumeLoaderScheme}:myVolumePET`; //+ cornerstone3D.utilities.uuidv4()
const volumeIdCTBase       = `${volumeLoaderScheme}:myVolumeCT`;
let volumeIdCT;
let volumeIdPET;

// Colors
const COLOR_RGB_FGD = 'rgb(218, 165, 32)' // 'goldenrod'
const COLOR_RGB_BGD = 'rgb(0, 0, 255)'    // 'blue'
const COLOR_RGBA_ARRAY_GREEN = [0  , 255, 0, 128]   // 'green'
const COLOR_RGBA_ARRAY_RED   = [255, 0  , 0, 128]     // 'red'
const COLOR_RGBA_ARRAY_PINK  = [255, 192, 203, 128] // 'pink'

const MASK_TYPE_GT   = 'GT';
const MASK_TYPE_PRED = 'PRED';
const MASK_TYPE_REFINE = 'REFINE';

const MODALITY_CT = 'CT';
const MODALITY_MR = 'MR';
const MODALITY_PT = 'PT';
const MODALITY_SEG      = 'SEG';
const MODALITY_RTSTRUCT = 'RTSTRUCT';
let MODALITY_CONTOURS;
const INIT_BRUSH_SIZE = 5

const scribbleSegmentationIdBase = `SCRIBBLE_SEGMENTATION_ID`; // this should not change for different scribbles

const gtSegmentationIdBase   = ["LOAD_SEGMENTATION_ID", MASK_TYPE_GT].join('::') 
const predSegmentationIdBase = ["LOAD_SEGMENTATION_ID", MASK_TYPE_PRED].join('::')
let scribbleSegmentationId;
let scribbleSegmentationUIDs;
let gtSegmentationId
let gtSegmentationUIDs;
let predSegmentationId;
let predSegmentationUIDs;

const SEG_TYPE_LABELMAP = 'LABELMAP'
const SEG_TYPE_CONTOUR  = 'CONTOUR'

// Python server
// const PYTHON_SERVER_CERT        = fs.readFileSync('../backend/hostCert.pem')
// const PYTHON_SERVER_HTTPSAGENT = new https.Agent({ ca: PYTHON_SERVER_CERT })
const URL_PYTHON_SERVER = `${window.location.origin}`.replace('50000', '55000') //[`${window.location.origin}`, 'https://localhost:55000']
const ENDPOINT_PREPARE  = '/prepare'
const ENDPOINT_PROCESS  = '/process'
const KEY_DATA          = 'data'
const KEY_IDENTIFIER    = 'identifier'
const KEY_POINTS_3D     = 'points3D'
const KEY_SCRIB_TYPE    = 'scribbleType'
const KEY_CASE_NAME     = 'caseName'
const METHOD_POST       = 'POST'
const HEADERS_JSON      = {'Content-Type': 'application/json',}

const KEY_FGD = 'fgd'
const KEY_BGD = 'bgd'

// Tools
const MODE_ACTIVE  = 'Active';
const MODE_PASSIVE = 'Passive';
const MODE_ENABLED = 'Enabled';
const MODE_DISABLED = 'Disabled';
const SHORTCUT_KEY_C = 'c';
const SHORTCUT_KEY_ARROW_LEFT = 'ArrowLeft';
const SHORTCUT_KEY_ARROW_RIGHT = 'ArrowRight';

// General
let imageIdsCT   = []
let ctFetchBool  = false;
let fusedPETCT   = false;
let petBool      = false;
let totalImagesIdsCT = undefined;
let totalImagesIdsPET = undefined;
let totalROIsRTSTRUCT = undefined;
let patientIdx        = undefined;

// let axialSliceId    = undefined;
// let sagittalSliceId = undefined;
// let coronalSliceId  = undefined;
// let maxAxialId      = undefined;
// let maxSagittalId   = undefined;
// let maxCoronalId    = undefined;

// Orthan Data
let orthanDataURLS = []

/****************************************************************
*                         HTML ELEMENTS  
*****************************************************************/

async function createViewPortsHTML() {

    ////////////////////////////////////////////////////////////////////// Step 0 - Create viewport grid
    const contentDiv = document.getElementById(contentDivId);

    const viewportGridDiv = document.createElement('div');
    viewportGridDiv.id = viewPortDivId;
    viewportGridDiv.style.display = 'flex';
    viewportGridDiv.style.flexDirection = 'row';
    viewportGridDiv.oncontextmenu = (e) => e.preventDefault(); // Disable right click

    ////////////////////////////////////////////////////////////////////// Create viewport elements (Axial, Sagittal, Coronal)
    // Step 1.1 - element for axial view
    const axialDiv = document.createElement('div');
    axialDiv.style.width = '500px';
    axialDiv.style.height = '500px';
    axialDiv.id = axialID;

    // Step 1.2 - element for sagittal view
    const sagittalDiv = document.createElement('div');
    sagittalDiv.style.width = '500px';
    sagittalDiv.style.height = '500px';
    sagittalDiv.id = sagittalID;

    // Step 1.2 - element for coronal view
    const coronalDiv = document.createElement('div');
    coronalDiv.style.width = '500px';
    coronalDiv.style.height = '500px';
    coronalDiv.id = coronalID;

    ////////////////////////////////////////////////////////////////////// Step 2 - On the top-left of axialDiv add a div to indicate server status
    axialDiv.style.position = 'relative';
    const serverStatusDiv = document.createElement('div');
    serverStatusDiv.style.position = 'absolute'; // Change to absolute
    serverStatusDiv.style.top = '3';
    serverStatusDiv.style.left = '3';
    serverStatusDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    serverStatusDiv.style.color = 'white';
    serverStatusDiv.style.padding = '5px';
    serverStatusDiv.style.zIndex = '1000'; // Ensure zIndex is a string
    serverStatusDiv.id = 'serverStatusDiv';
    axialDiv.appendChild(serverStatusDiv);

    // Step 2.1.2 - add a blinking circle with red color to serverStatusDiv
    const serverStatusCircle = document.createElement('div');
    serverStatusCircle.style.width = '10px';
    serverStatusCircle.style.height = '10px';
    serverStatusCircle.style.backgroundColor = 'red';
    serverStatusCircle.style.borderRadius = '50%';
    serverStatusCircle.style.animation = 'blinker 1s linear infinite';
    serverStatusDiv.appendChild(serverStatusCircle);
    const style = document.createElement('style');
    style.type = 'text/css';
    const keyframes = `
        @keyframes blinker {
            50% {
                opacity: 0;
            }
        }
    `;
    style.appendChild(document.createTextNode(keyframes));
    document.head.appendChild(style);

    // Add a div, in serverStatusDiv, where if I hover over it, shows me text related to server status
    const serverStatusTextDiv = document.createElement('div');
    serverStatusTextDiv.style.position = 'absolute'; // Change to absolute
    serverStatusTextDiv.style.top = '0';
    serverStatusTextDiv.style.left = '20';
    serverStatusTextDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    serverStatusTextDiv.style.color = 'white';
    serverStatusTextDiv.style.padding = '5px';
    serverStatusTextDiv.style.zIndex = '1000'; // Ensure zIndex is a string
    serverStatusTextDiv.id = 'serverStatusTextDiv';
    serverStatusTextDiv.style.display = 'none';
    serverStatusTextDiv.innerHTML = 'Server Status: <br> - Red: Server is not running <br> - Green: Server is running';
    serverStatusTextDiv.style.width = 0.5*parseInt(axialDiv.style.width);
    serverStatusDiv.appendChild(serverStatusTextDiv);

    // Add the hover text
    serverStatusDiv.addEventListener('mouseover', function() {
        serverStatusTextDiv.style.display = 'block';
    });
    serverStatusTextDiv.addEventListener('mouseout', function() {
        serverStatusTextDiv.style.display = 'none';
    });

    ////////////////////////////////////////////////////////////////////// Step 3.1 - On the  top-right of axialDiv add a div for the slice number
    axialDiv.style.position = 'relative';
    const axialSliceDiv = document.createElement('div');
    axialSliceDiv.style.position = 'absolute'; // Change to absolute
    axialSliceDiv.style.top = '3';
    axialSliceDiv.style.right = '3';
    axialSliceDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    axialSliceDiv.style.color = 'white';
    axialSliceDiv.style.padding = '5px';
    axialSliceDiv.style.zIndex = '1000'; // Ensure zIndex is a string
    axialSliceDiv.id = 'axialSliceDiv';
    axialDiv.appendChild(axialSliceDiv);

    ////////////////////////////////////////////////////////////////////// Step 3.2 - On the  top-right of sagittalDiv add a div for the slice number
    sagittalDiv.style.position = 'relative';
    const sagittalSliceDiv = document.createElement('div');
    sagittalSliceDiv.style.position = 'absolute'; // Change to absolute
    sagittalSliceDiv.style.top = '0';
    sagittalSliceDiv.style.right = '20';
    sagittalSliceDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    sagittalSliceDiv.style.color = 'white';
    sagittalSliceDiv.style.padding = '5px';
    sagittalSliceDiv.style.zIndex = '1000'; // Ensure zIndex is a string
    sagittalSliceDiv.id = 'sagittalSliceDiv';
    sagittalDiv.appendChild(sagittalSliceDiv);

    ////////////////////////////////////////////////////////////////////// Step 3.3 - On the  top-right of coronalDiv add a div for the slice number
    coronalDiv.style.position = 'relative';
    const coronalSliceDiv = document.createElement('div');
    coronalSliceDiv.style.position = 'absolute'; // Change to absolute
    coronalSliceDiv.style.top = '0';
    coronalSliceDiv.style.right = '20';
    coronalSliceDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    coronalSliceDiv.style.color = 'white';
    coronalSliceDiv.style.padding = '5px';
    coronalSliceDiv.style.zIndex = '1000'; // Ensure zIndex is a string
    coronalSliceDiv.id = 'coronalSliceDiv';
    coronalDiv.appendChild(coronalSliceDiv);

    viewportGridDiv.appendChild(axialDiv);
    viewportGridDiv.appendChild(sagittalDiv);
    viewportGridDiv.appendChild(coronalDiv);

    contentDiv.appendChild(viewportGridDiv);

    return {contentDiv, viewportGridDiv, axialDiv, sagittalDiv, coronalDiv, axialSliceDiv, sagittalSliceDiv, coronalSliceDiv, serverStatusCircle, serverStatusTextDiv};
}
const {axialDiv, sagittalDiv, coronalDiv, axialSliceDiv, sagittalSliceDiv, coronalSliceDiv, serverStatusCircle, serverStatusTextDiv} = await createViewPortsHTML();

async function createContouringHTML() {

    //////////////////////////////////////////////////////////////////////////// Step 1.0 - Get interactionButtonsDiv and contouringButtonDiv
    const interactionButtonsDiv = document.getElementById(interactionButtonsDivId);
    const contouringButtonDiv = document.createElement('div');
    contouringButtonDiv.id = contouringButtonDivId;

    const contouringButtonInnerDiv = document.createElement('div');
    contouringButtonInnerDiv.style.display = 'flex';
    contouringButtonInnerDiv.style.flexDirection = 'row';

    ////////////////////////////////////////////////////////////////////////////  Step 2 - Create a button to enable PlanarFreehandContourSegmentationTool
    // Step 2.1 - Create a button
    const contourSegmentationToolButton = document.createElement('button');
    contourSegmentationToolButton.id = contourSegmentationToolButtonId;
    contourSegmentationToolButton.title = 'Enable Circle Brush \n (+/- to change brush size)'; // Tooltip text

    // Step 2.2 - Create an image element for the logo
    const logoBrush = document.createElement('img');
    logoBrush.src = './logo-brush.png'; // Replace with the actual path to your logo
    logoBrush.alt = 'Circle Brush';
    logoBrush.style.width = '50px'; // Adjust the size as needed
    logoBrush.style.height = '50px'; // Adjust the size as needed
    logoBrush.style.marginRight = '5px'; // Optional: Add some space between the logo and the text
    contourSegmentationToolButton.appendChild(logoBrush);

    // Step 2.3 - Create a text node for the button text
    const buttonText = document.createTextNode('Circle Brush');
    contourSegmentationToolButton.appendChild(buttonText);
    contourSegmentationToolButton.style.fontSize = '10px';

    contourSegmentationToolButton.style.display = 'flex';
    contourSegmentationToolButton.style.flexDirection = 'column';
    contourSegmentationToolButton.style.alignItems = 'center';
    
    ////////////////////////////////////////////////////////////////////////////   Step 3 - Create a button to enable SculptorTool
    // Step 3.1 - Create a button
    const sculptorToolButton = document.createElement('button');
    sculptorToolButton.id = sculptorToolButtonId;
    sculptorToolButton.title = 'Enable Circle Eraser \n (+/- to change brush size)';

    // Step 3.2 - Create an image element for the logo
    const logoEraser = document.createElement('img');
    logoEraser.src = './logo-eraser.png'; // Replace with the actual path to your logo
    logoEraser.alt = 'Circle Eraser';
    logoEraser.style.width = '50px'; // Adjust the size as needed
    logoEraser.style.height = '50px'; // Adjust the size as needed
    sculptorToolButton.style.marginRight = '5px'; // Optional: Add some space between the logo and the text
    sculptorToolButton.appendChild(logoEraser);

    // Step 3.3 - Create a text node for the button text
    const sculptorButtonText = document.createTextNode('Circle Eraser');
    sculptorToolButton.appendChild(sculptorButtonText);
    sculptorToolButton.style.fontSize = '10px';

    sculptorToolButton.style.display = 'flex';
    sculptorToolButton.style.flexDirection = 'column';
    sculptorToolButton.style.alignItems = 'center';
    
    //////////////////////////////////////////////////////////////////////////// Step 4 - No contouring button
    // Step 4.1 - Create a button
    const windowLevelButton     = document.createElement('button');
    windowLevelButton.id        = windowLevelButtonId;
    windowLevelButton.title = 'Enable WindowLevelTool';

    // Step 4.2 - Create an image element for the logo
    const logoWindowLevel = document.createElement('img');
    logoWindowLevel.src = './logo-windowing.png'; // Replace with the actual path to your logo
    logoWindowLevel.alt = 'WindowLevel';
    logoWindowLevel.style.width = '50px'; // Adjust the size as needed
    logoWindowLevel.style.height = '50px'; // Adjust the size as needed
    windowLevelButton.style.marginRight = '5px'; // Optional: Add some space between the logo and the text
    windowLevelButton.appendChild(logoWindowLevel);

    // Step 4.3 - Create a text node for the button text
    const windowLevelButtonText = document.createTextNode('WindowLevel');
    windowLevelButton.appendChild(windowLevelButtonText);
    windowLevelButton.style.fontSize = '10px';

    windowLevelButton.style.display = 'flex';
    windowLevelButton.style.flexDirection = 'column'; 
    windowLevelButton.style.alignItems = 'center';

    
    ////////////////////////////////////////////////////////////////////////////////// Step 5 - AI scribble button

    // Step 5.1 - Create a div
    const editBaseContourViaScribbleDiv = document.createElement('div');
    editBaseContourViaScribbleDiv.style.display = 'flex';
    editBaseContourViaScribbleDiv.style.flexDirection = 'row';
    
    // Step 5.2 - Create a button
    const editBaseContourViaScribbleButton     = document.createElement('button');
    editBaseContourViaScribbleButton.id        = 'editBaseContourViaScribbleButton';
    editBaseContourViaScribbleButton.title     = 'Enable AI-scribble';
    editBaseContourViaScribbleDiv.appendChild(editBaseContourViaScribbleButton);
    
    // Step 5.3 - Create an image element for the logo
    const logoScribble = document.createElement('img');
    logoScribble.src = './logo-scribble.png'; // Replace with the actual path to your logo
    logoScribble.alt = 'AI-Scribble';
    logoScribble.style.width = '50px'; // Adjust the size as needed
    logoScribble.style.height = '50px'; // Adjust the size as needed
    editBaseContourViaScribbleButton.appendChild(logoScribble);

    // Step 5.4 - Create a text node for the button text
    const editBaseContourViaScribbleButtonText = document.createTextNode('AI-Scribble');
    editBaseContourViaScribbleButton.appendChild(editBaseContourViaScribbleButtonText);
    editBaseContourViaScribbleButton.style.fontSize = '10px';

    editBaseContourViaScribbleButton.style.display = 'flex';
    editBaseContourViaScribbleButton.style.flexDirection = 'column';
    editBaseContourViaScribbleButton.style.alignItems = 'center';

    ////////////////////////////////////////////////////////////////////////////////// Step 6 - Add checkboxes for fgd and bgd
    
    // Step 6.1 - Create div(s) for the checkbox(es)
    const scribbleCheckboxDiv = document.createElement('div');
    scribbleCheckboxDiv.style.display = 'flex';
    scribbleCheckboxDiv.style.flexDirection = 'column';
    scribbleCheckboxDiv.style.justifyContent = 'center';
    editBaseContourViaScribbleDiv.appendChild(scribbleCheckboxDiv);

    const fgdChecBoxParentDiv = document.createElement('div');
    fgdChecBoxParentDiv.style.display = 'flex';
    fgdChecBoxParentDiv.style.flexDirection = 'row';
    scribbleCheckboxDiv.appendChild(fgdChecBoxParentDiv);

    const bgdCheckboxParentDiv = document.createElement('div');
    bgdCheckboxParentDiv.style.display = 'flex';
    bgdCheckboxParentDiv.style.flexDirection = 'row';
    scribbleCheckboxDiv.appendChild(bgdCheckboxParentDiv);

    // Step 6.2.1 - Add checkbox for fgd
    const fgdCheckbox = document.createElement('input');
    fgdCheckbox.type = 'checkbox';
    fgdCheckbox.id = 'fgdCheckbox';
    fgdCheckbox.name = 'Foreground Scribble';
    fgdCheckbox.value = 'Foreground Scribble';
    fgdCheckbox.checked = true;
    fgdCheckbox.style.transform = 'scale(1.5)';
    fgdCheckbox.addEventListener('change', function() {
        if (this.checked){
            bgdCheckbox.checked = false;
            setAnnotationColor(COLOR_RGB_FGD);
        }
    });
    fgdChecBoxParentDiv.appendChild(fgdCheckbox);

    // Step 6.2.2 - Add label for fgd
    const fgdLabel = document.createElement('label');
    fgdLabel.htmlFor = 'fgdCheckbox';
    fgdLabel.style.color = COLOR_RGB_FGD // 'goldenrod'; // '#DAA520', 'rgb(218, 165, 32)'
    fgdLabel.appendChild(document.createTextNode('Foreground Scribble'));
    fgdChecBoxParentDiv.appendChild(fgdLabel);
    

    // Step 6.3 - Add checkbox for bgd
    const bgdCheckbox = document.createElement('input');
    bgdCheckbox.type = 'checkbox';
    bgdCheckbox.id = 'bgdCheckbox';
    bgdCheckbox.name = 'Background Scribble';
    bgdCheckbox.value = 'Background Scribble';
    bgdCheckbox.checked = false;
    bgdCheckbox.style.transform = 'scale(1.5)';
    bgdCheckbox.addEventListener('change', function() {
        if (this.checked){
            fgdCheckbox.checked = false;
            setAnnotationColor(COLOR_RGB_BGD);
        }
    });
    bgdCheckboxParentDiv.appendChild(bgdCheckbox);

    // Step 6.4 - Add label for bgd
    const bgdLabel = document.createElement('label');
    bgdLabel.htmlFor = 'bgdCheckbox';
    bgdLabel.style.color = COLOR_RGB_BGD;
    bgdLabel.appendChild(document.createTextNode('Background Scribble'));
    bgdCheckboxParentDiv.appendChild(bgdLabel);

    ////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////// Step 1.99 - Add buttons to contouringButtonDiv
    contouringButtonDiv.appendChild(contouringButtonInnerDiv);
    contouringButtonInnerDiv.appendChild(contourSegmentationToolButton);
    contouringButtonInnerDiv.appendChild(sculptorToolButton);
    contouringButtonInnerDiv.appendChild(windowLevelButton);
    contouringButtonInnerDiv.appendChild(editBaseContourViaScribbleDiv);
    
    // Step 7 - Add contouringButtonDiv to contentDiv
    interactionButtonsDiv.appendChild(contouringButtonDiv); 
    
    return {windowLevelButton, contourSegmentationToolButton, sculptorToolButton, editBaseContourViaScribbleButton, fgdCheckbox, bgdCheckbox};

}
const {windowLevelButton, contourSegmentationToolButton, sculptorToolButton, editBaseContourViaScribbleButton, fgdCheckbox, bgdCheckbox} = await createContouringHTML();

async function otherHTMLElements(){

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
        resetView();
    });

    // Step 3.0 - Show PET button
    const showPETButton = document.createElement('button');
    showPETButton.id = 'showPETButton';
    showPETButton.innerHTML = 'Show PET';
    showPETButton.addEventListener('click', async function() {
        if (petBool){
            const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
            if (fusedPETCT) {
                viewportIds.forEach((viewportId) => {
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
    // const mouseHoverDiv = document.createElement('div');
    // mouseHoverDiv.id = 'mouseHoverDiv';
    const mouseHoverDiv = document.createElement('div');
    mouseHoverDiv.style.position = 'absolute'; // Change to absolute
    mouseHoverDiv.style.bottom = '3';
    mouseHoverDiv.style.left = '3';
    mouseHoverDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    mouseHoverDiv.style.color = 'white';
    mouseHoverDiv.style.padding = '5px';
    mouseHoverDiv.style.zIndex = '1000'; // Ensure zIndex is a string
    mouseHoverDiv.id = 'mouseHoverDiv';
    mouseHoverDiv.style.fontSize = '10px';
    axialDiv.appendChild(mouseHoverDiv);

    const canvasPosHTML = document.createElement('p');
    const ctValueHTML = document.createElement('p');
    const ptValueHTML = document.createElement('p');
    canvasPosHTML.innerText = 'Canvas position:';
    ctValueHTML.innerText = 'CT value:';
    ptValueHTML.innerText = 'PT value:';

    viewportIds.forEach((viewportId_, index) => {
        const viewportDiv = document.getElementById(viewportIds[index]);
        viewportDiv.addEventListener('mousemove', function(evt) {
            if (volumeIdCT != undefined){
                const volumeCTThis = cornerstone3D.cache.getVolume(volumeIdCT);
                if (volumeCTThis != undefined){
                    const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
                    const rect        = viewportDiv.getBoundingClientRect();
                    const canvasPos   = [Math.floor(evt.clientX - rect.left),Math.floor(evt.clientY - rect.top),];
                    const viewPortTmp = renderingEngine.getViewport(viewportIds[index]);
                    const worldPos    = viewPortTmp.canvasToWorld(canvasPos);
                    let index3D       = getIndex(volumeCTThis, worldPos) //.forEach((val) => Math.round(val));
                    if (canvasPos != undefined && index3D != undefined && worldPos != undefined){
                        index3D       = index3D.map((val) => Math.round(val));
                        canvasPosHTML.innerText = `Canvas position: (${viewportIds[index]}) \n ==> (${canvasPos[0]}, ${canvasPos[1]}) || (${index3D[0]}, ${index3D[1]}, ${index3D[2]})`;
                        ctValueHTML.innerText = `CT value: ${getValue(volumeCTThis, worldPos)}`;
                        if (volumeIdPET != undefined){
                            const volumePTThis = cornerstone3D.cache.getVolume(volumeIdPET);
                            ptValueHTML.innerText = `PT value: ${getValue(volumePTThis, worldPos)}`;
                        }
                    }else{
                        showToast('Mousemove Event: Error in getting canvasPos, index3D, worldPos')
                    }                    
                    
                }
            }
        });
    });

    mouseHoverDiv.appendChild(canvasPosHTML);
    mouseHoverDiv.appendChild(ctValueHTML);
    mouseHoverDiv.appendChild(ptValueHTML);

    // Step 5 - Create dropdown for case selection
    const caseSelectionHTML     = document.createElement('select');
    caseSelectionHTML.id        = 'caseSelection';
    caseSelectionHTML.innerHTML = 'Case Selection';
    caseSelectionHTML.addEventListener('change', async function() {
        global.patientIdx = parseInt(this.value);
        await fetchAndLoadData(global.patientIdx);
    });

    // Step 99 - Add to contentDiv
    otherButtonsDiv.appendChild(caseSelectionHTML);
    otherButtonsDiv.appendChild(resetViewButton);
    otherButtonsDiv.appendChild(showPETButton);
    // otherButtonsDiv.appendChild(mouseHoverDiv);
    interactionButtonsDiv.appendChild(otherButtonsDiv);

    return {caseSelectionHTML, resetViewButton, showPETButton};
}
const {caseSelectionHTML, showPETButton} = await otherHTMLElements(0);

function resetView(){
    const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
    [axialID, sagittalID, coronalID].forEach((viewportId) => {
        const viewportTmp = renderingEngine.getViewport(viewportId);
        viewportTmp.resetCamera();
        viewportTmp.render();
    });
}

async function getLoaderHTML(){

    // Step 1 - Create a loaderDiv
    const loaderDiv = document.getElementById('loaderDiv');
    if (loaderDiv == null){
        const loaderDiv = document.createElement('div');
        loaderDiv.id = 'loaderDiv';
        loaderDiv.style.display = 'none'; // Initially hidden

        // Step 2 - Create the gray-out div
        const grayOutDiv                 = document.createElement('div');
        grayOutDiv.id                    = 'grayOutDiv';
        grayOutDiv.style.position        = 'absolute';
        grayOutDiv.style.backgroundColor = 'rgba(128, 128, 128, 0.5)'; // Semi-transparent gray
        grayOutDiv.style.zIndex          = '999'; // Ensure it's below the loadingIndicator but above everything else
        // grayOutDiv.style.display         = 'none'; // Initially hidden

        // Step 3 - Create the loadingIndicatorDiv
        const loadingIndicatorDiv = document.createElement('div');
        loadingIndicatorDiv.id                 = 'loadingIndicatorDiv';
        loadingIndicatorDiv.style.width        = '50px';
        loadingIndicatorDiv.style.height       = '50px';
        loadingIndicatorDiv.style.borderRadius = '50%';
        loadingIndicatorDiv.style.border       = '5px solid #f3f3f3';
        loadingIndicatorDiv.style.borderTop    = '5px solid #3498db';
        loadingIndicatorDiv.style.animation    = 'spin 2s linear infinite';
        loadingIndicatorDiv.style.margin       = 'auto';
        loadingIndicatorDiv.style.zIndex       = '1000'; // Ensure it's on top
        // loadingIndicatorDiv.style.display      = 'none'; // Initially hidden

        // Step 4 - Add the children to the loaderDiv
        loaderDiv.appendChild(grayOutDiv);
        loaderDiv.appendChild(loadingIndicatorDiv);
        document.body.appendChild(loaderDiv);
        document.head.appendChild(document.createElement('style')).textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            `;

        // Step 5 - Position the grayOutDiv and loadingIndicatorDiv 
        await setLoaderHTMLPosition();
        // const contentDiv = document.getElementById(contentDivId);
        // const contentDivRect = contentDiv.getBoundingClientRect();
        // // console.log(' -- contentDivRect: ', contentDivRect);

        // // Step 5.1 - Position the loadingIndicatorDiv
        // loadingIndicatorDiv.style.position = 'absolute';
        // loadingIndicatorDiv.style.top = `${(contentDivRect.top + (contentDivRect.bottom - contentDivRect.top) / 2) - (loadingIndicatorDiv.offsetHeight / 2)}px`;
        // loadingIndicatorDiv.style.left = `${(contentDivRect.left + (contentDivRect.right - contentDivRect.left) / 2) - (loadingIndicatorDiv.offsetWidth / 2)}px`;
        

        // // Step 5.2 - place the grayOutDiv on top of contentDiv
        // grayOutDiv.style.top = `${contentDivRect.top}px`;
        // grayOutDiv.style.left = `${contentDivRect.left}px`;
        // grayOutDiv.style.width = `${contentDivRect.right - contentDivRect.left}px`;
        // grayOutDiv.style.height = `${contentDivRect.bottom - contentDivRect.top}px`;
    }

    return {loaderDiv};
}

async function setLoaderHTMLPosition(set=true){

    // Step 1 - Get divs
    const contentDiv          = document.getElementById(contentDivId);
    const loadingIndicatorDiv = document.getElementById('loadingIndicatorDiv');
    const grayOutDiv          = document.getElementById('grayOutDiv');

    if (set){
        // Step 2 - Get the bounding rect of contentDiv
        const contentDivRect = contentDiv.getBoundingClientRect();
        // console.log(' -- contentDivRect: ', contentDivRect);

        // Step 3 - Position the loadingIndicatorDiv
        loadingIndicatorDiv.style.position = 'absolute';
        loadingIndicatorDiv.style.top = `${(contentDivRect.top + (contentDivRect.bottom - contentDivRect.top) / 2) - (loadingIndicatorDiv.offsetHeight / 2)}px`;
        loadingIndicatorDiv.style.left = `${(contentDivRect.left + (contentDivRect.right - contentDivRect.left) / 2) - (loadingIndicatorDiv.offsetWidth / 2)}px`;
        
        // Step 4 - place the grayOutDiv on top of contentDiv
        grayOutDiv.style.top = `${contentDivRect.top}px`;
        grayOutDiv.style.left = `${contentDivRect.left}px`;
        grayOutDiv.style.width = `${contentDivRect.right - contentDivRect.left}px`;
        grayOutDiv.style.height = `${contentDivRect.bottom - contentDivRect.top}px`;
    }else {
        loadingIndicatorDiv.style.position = 'absolute';
        loadingIndicatorDiv.style.top = `0`;
        loadingIndicatorDiv.style.left = `0`;

        grayOutDiv.width = '0';
        grayOutDiv.height = '0';
    }
    

}

async function showLoaderAnimation() {

    const {loaderDiv} = await getLoaderHTML();
    if (loaderDiv) {
        loaderDiv.style.display = 'block';
        setLoaderHTMLPosition(true);
    }
}

async function unshowLoaderAnimation() {

    const {loaderDiv} = await getLoaderHTML();
    if (loaderDiv) {
        loaderDiv.style.display = 'none';
        setLoaderHTMLPosition(false);
    }
}

function printHeaderInConsole(strToPrint){
    console.log(`\n\n | ================================================================ ${strToPrint} ================================================================ | \n\n`)
}

function setServerStatus(serverMessageId, serverMessageStr){
    // 0 - loading, 1 - successful, 2 - error
    if (serverMessageId == 0){
        serverStatusCircle.style.backgroundColor = 'red';
        serverStatusCircle.style.animation = 'blinker 1s linear infinite';
        serverStatusTextDiv.innerHTML = 'Server Status: <br> - Red: Server is not running <br> - Green: Server is running';
    } else if (serverMessageId == 1){
        serverStatusCircle.style.backgroundColor = 'red';
        serverStatusCircle.style.animation = 'none';
        serverStatusTextDiv.innerHTML = serverMessageStr;
    }else if (serverMessageId == 2){
        serverStatusCircle.style.backgroundColor = 'green';
        serverStatusCircle.style.animation = 'none';
        serverStatusTextDiv.innerHTML = serverMessageStr;
    } else if (serverMessageId == 3){
        serverStatusCircle.style.backgroundColor = 'red';
        serverStatusCircle.style.animation = 'blinker 1s linear infinite';
        serverStatusTextDiv.innerHTML = serverMessageStr;
    }

}

/****************************************************************
*                             UTILS  
*****************************************************************/



const URL_ROOT = `${window.location.origin}`;

const KEY_ORTHANC_ID = 'OrthancId';
const KEY_STUDIES    = 'Studies';
const KEY_SERIES     = 'Series';
const KEY_STUDIES_ORTHANC_ID  = 'StudiesOrthancId';
const KEY_SERIES_ORTHANC_ID   = 'SeriesOrthancId';
const KEY_INSTANCE_ORTHANC_ID = 'InstanceOrthancId';
const KEY_STUDY_UID     = 'StudyUID';
const KEY_SERIES_UID    = 'SeriesUID';
const KEY_INSTANCE_UID  = 'InstanceUID';
const KEY_MODALITY      = 'Modality';

const KEY_MODALITY_SEG = 'SEG';
const KEY_SERIES_DESC = 'SeriesDescription';

let orthancHeaders = new Headers();
orthancHeaders.set('Authorization', 'Basic ' + btoa('orthanc'+ ":" + 'orthanc'));

async function getOrthancPatientIds() {
    let res = {};

    try {
        // Step 1 - Get Orthanc Patient IDs
        let query = `${URL_ROOT}/patients`;
        let response = await fetch(query);
        if (response.ok) {
            let patientOrthancIds = await response.json();
            for (let patientOrthancId of patientOrthancIds) {

                // Step 2 - Get Patient Data
                let patientQuery = `${URL_ROOT}/patients/${patientOrthancId}`;
                let patientResponse = await fetch(patientQuery);
                if (patientResponse.ok) {
                    let patientData = await patientResponse.json();
                    let patientActualId = patientData.MainDicomTags.PatientID;
                    let patientStudiesOrthancIds = patientData.Studies;
                    res[patientActualId] = {
                        [KEY_ORTHANC_ID]: patientOrthancId,
                        [KEY_STUDIES]: []
                    };
                    for (let patientStudiesOrthancId of patientStudiesOrthancIds) {
                        res[patientActualId][KEY_STUDIES].push({[KEY_STUDIES_ORTHANC_ID]: patientStudiesOrthancId, [KEY_STUDY_UID]: null, [KEY_SERIES]: []});
                        
                        // Step 3 - Get Study Data
                        let studyRequest = `${URL_ROOT}/studies/${patientStudiesOrthancId}`;
                        let studyResponse = await fetch(studyRequest);
                        if (studyResponse.ok) {
                            let studyData = await studyResponse.json();
                            let studyUID = studyData.MainDicomTags.StudyInstanceUID;
                            res[patientActualId][KEY_STUDIES][res[patientActualId][KEY_STUDIES].length - 1][KEY_STUDY_UID] = studyUID;
                            let seriesOrthancIds = studyData.Series;
                            for (let seriesOrthancId of seriesOrthancIds) {
                                res[patientActualId][KEY_STUDIES][res[patientActualId][KEY_STUDIES].length - 1][KEY_SERIES].push(
                                    {
                                        [KEY_SERIES_ORTHANC_ID]: seriesOrthancId
                                        , [KEY_SERIES_DESC]: null
                                        , [KEY_SERIES_UID]: null
                                        , [KEY_MODALITY]: null
                                        , [KEY_INSTANCE_UID]: null
                                        , [KEY_INSTANCE_ORTHANC_ID]: null
                                    }
                                );
                                
                                // Step 4 - Get Series Data
                                let seriesRequest = `${URL_ROOT}/series/${seriesOrthancId}`;
                                let seriesResponse = await fetch(seriesRequest);
                                if (seriesResponse.ok) {
                                    let seriesData = await seriesResponse.json();
                                    let seriesDesc = seriesData.MainDicomTags.SeriesDescription || null;
                                    let seriesUID = seriesData.MainDicomTags.SeriesInstanceUID;
                                    let modality = seriesData.MainDicomTags.Modality;
                                    let lastSeriesIndex = res[patientActualId][KEY_STUDIES][res[patientActualId][KEY_STUDIES].length - 1][KEY_SERIES].length - 1;
                                    res[patientActualId][KEY_STUDIES][res[patientActualId][KEY_STUDIES].length - 1][KEY_SERIES][lastSeriesIndex][KEY_SERIES_DESC] = seriesDesc;
                                    res[patientActualId][KEY_STUDIES][res[patientActualId][KEY_STUDIES].length - 1][KEY_SERIES][lastSeriesIndex][KEY_SERIES_UID] = seriesUID;
                                    res[patientActualId][KEY_STUDIES][res[patientActualId][KEY_STUDIES].length - 1][KEY_SERIES][lastSeriesIndex][KEY_MODALITY] = modality;
                                    
                                    // Step 5 - Get Instance Data (for SEG only)
                                    if (modality === MODALITY_SEG || modality === MODALITY_RTSTRUCT) {
                                        let instanceRequest = `${URL_ROOT}/instances/${seriesData.Instances[0]}`;
                                        let instanceResponse = await fetch(instanceRequest);
                                        if (instanceResponse.ok) {
                                            let instanceData = await instanceResponse.json();
                                            let instanceUID = instanceData.MainDicomTags.SOPInstanceUID;
                                            res[patientActualId][KEY_STUDIES][res[patientActualId][KEY_STUDIES].length - 1][KEY_SERIES][lastSeriesIndex][KEY_INSTANCE_UID] = instanceUID;
                                            res[patientActualId][KEY_STUDIES][res[patientActualId][KEY_STUDIES].length - 1][KEY_SERIES][lastSeriesIndex][KEY_INSTANCE_ORTHANC_ID] = instanceData.ID;
                                        } else {
                                            console.error(' - [getOrthancPatientIds()] instanceResponse: ', instanceResponse.status, instanceResponse.statusText);
                                        }
                                    }
                                } else {
                                    console.error(' - [getOrthancPatientIds()] seriesResponse: ', seriesResponse.status, seriesResponse.statusText);
                                }
                            }
                        } else {
                            console.error(' - [getOrthancPatientIds()] studyResponse: ', studyResponse.status, studyResponse.statusText);
                        }
                    }
                } else {
                    console.error(' - [getOrthancPatientIds()] patientResponse: ', patientResponse.status, patientResponse.statusText);
                }
            }
        } else {
            console.error(' - [getOrthancPatientIds()] response: ', response.status, response.statusText);
        }
    } catch (error) {
        console.error(error);
    }

    console.log(' - [getOrthancPatientIds()] res: ', res);
    return res;
}

async function getDataURLs(verbose = false){

    ////////////////// Non-SEG Datasets //////////////////
    // Example 1 (C3D - CT + PET)
    orthanDataURLS.push({
        caseName : 'C3D - CT + PET',
        reverseImageIds  : true,
        searchObjCT: {
            StudyInstanceUID : '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
            SeriesInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561',
            wadoRsRoot       : 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
        }, searchObjPET:{
            StudyInstanceUID : '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
            SeriesInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7009.2403.879445243400782656317561081015',
            wadoRsRoot       : 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
        }, searchObjRTSGT:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            SOPInstanceUID:'',
            wadoRsRoot: '',
        }, searchObjRTSPred:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            SOPInstanceUID:'',
            wadoRsRoot: '',
        },
    });

    ////////////////// SEG Datasets //////////////////
    // Example 2 (C3D - Abdominal CT + SEG) (StageII-Colorectal-CT-005: ) - https://www.cornerstonejs.org/live-examples/segmentationvolume
    // [NOTE: Unable to find on SEG on TCIA]
    orthanDataURLS.push({
        caseName :'C3D - Abdominal CT + SEG',
        reverseImageIds  : true,
        searchObjCT:{
            StudyInstanceUID : "1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458",
            SeriesInstanceUID: "1.3.6.1.4.1.14519.5.2.1.40445112212390159711541259681923198035",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjPET:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            wadoRsRoot: '',
        },searchObjRTSGT : {
            StudyInstanceUID : "1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458",
            SeriesInstanceUID: "1.2.276.0.7230010.3.1.3.481034752.2667.1663086918.611582",
            SOPInstanceUID   : "1.2.276.0.7230010.3.1.4.481034752.2667.1663086918.611583",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjRTSPred:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            SOPInstanceUID:'',
            wadoRsRoot: '',
        },
    });
    // Try in postman - https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458/series/1.3.6.1.4.1.14519.5.2.1.40445112212390159711541259681923198035/metadata

    // Example 3 (C3D - MR + SEG) - https://www.cornerstonejs.org/live-examples/segmentationvolume
    orthanDataURLS.push({
        caseName : 'C3D - MR + SEG',
        reverseImageIds  : true,
        searchObjCT : {
            StudyInstanceUID : "1.3.12.2.1107.5.2.32.35162.30000015050317233592200000046",
            SeriesInstanceUID: "1.3.12.2.1107.5.2.32.35162.1999123112191238897317963.0.0.0",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjPET:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            wadoRsRoot: '',
        }, searchObjRTSGT : {
            StudyInstanceUID : "1.3.12.2.1107.5.2.32.35162.30000015050317233592200000046",
            SeriesInstanceUID: "1.2.276.0.7230010.3.1.3.296485376.8.1542816659.201008",
            SOPInstanceUID   : "1.2.276.0.7230010.3.1.4.296485376.8.1542816659.201009",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjRTSPred:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            SOPInstanceUID:'',
            wadoRsRoot: '',
        },
    });

    // Example 4 (C3D - HCC - CT + SEG) (HCC-TACE-SEG --> HCC_004) (no e.g. figured out from https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies)
    // CT: https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.14519.5.2.1.1706.8374.643249677828306008300337414785/series/1.3.6.1.4.1.14519.5.2.1.1706.8374.285388762605622963541285440661/metadata
    // SEG: https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.14519.5.2.1.1706.8374.643249677828306008300337414785/series/1.2.276.0.7230010.3.1.3.8323329.773.1600928601.639561/metadata (Ctrl+F="instances")
    //  - https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.14519.5.2.1.1706.8374.643249677828306008300337414785/series/1.2.276.0.7230010.3.1.3.8323329.773.1600928601.639561/instances
    //  - [Works] https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.14519.5.2.1.1706.8374.643249677828306008300337414785/series/1.2.276.0.7230010.3.1.3.8323329.773.1600928601.639561/instances/1.2.276.0.7230010.3.1.4.8323329.773.1600928601.639562/metadata
    //  - [downloads] https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.14519.5.2.1.1706.8374.643249677828306008300337414785/series/1.2.276.0.7230010.3.1.3.8323329.773.1600928601.639561/instances/1.2.276.0.7230010.3.1.4.8323329.773.1600928601.639562
    orthanDataURLS.push({
        caseName : 'C3D - HCC - CT + SEG',
        reverseImageIds  : true,
        searchObjCT : {
            StudyInstanceUID : "1.3.6.1.4.1.14519.5.2.1.1706.8374.643249677828306008300337414785",
            SeriesInstanceUID: "1.3.6.1.4.1.14519.5.2.1.1706.8374.285388762605622963541285440661",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjPET:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            wadoRsRoot: '',
        }, searchObjRTSGT : {
            StudyInstanceUID : "1.3.6.1.4.1.14519.5.2.1.1706.8374.643249677828306008300337414785",
            SeriesInstanceUID: "1.2.276.0.7230010.3.1.3.8323329.773.1600928601.639561",
            SOPInstanceUID   : "1.2.276.0.7230010.3.1.4.8323329.773.1600928601.639562",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjRTSPred:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            SOPInstanceUID:'',
            wadoRsRoot: '',
        },
    });

    // Example 5 (C3D - Prostate MR + SEG) (QIN-PROSTATE-Repeatability --> PCAMPMRI-00012)
    // NOTE: Issue with overlapping segmentations
    orthanDataURLS.push({
        caseName :'C3D - QIN Prostate MR + SEG',
        reverseImageIds  : true,
        searchObjCT:{
            StudyInstanceUID : "1.3.6.1.4.1.14519.5.2.1.3671.4754.298665348758363466150039312520",
            SeriesInstanceUID: "1.3.6.1.4.1.14519.5.2.1.3671.4754.230497515093449653192531406300",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjPET:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            wadoRsRoot: '',
        },searchObjRTSGT : {
            StudyInstanceUID : "1.3.6.1.4.1.14519.5.2.1.3671.4754.298665348758363466150039312520",
            SeriesInstanceUID: "1.2.276.0.7230010.3.1.3.1426846371.300.1513205181.722",
            SOPInstanceUID   : "1.2.276.0.7230010.3.1.4.1426846371.300.1513205181.723",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjRTSPred:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            SOPInstanceUID:'',
            wadoRsRoot: '',
        },
    });

    ////////////////// RTSTRUCT Datasets //////////////////
    // Example 6 (C3D - Lung CT + RTSTruct) (NSCLC-Radiomics --> LUNG1-008)
    // Note: Unable to find RTSTRUCT on cloudfront.net
    // RTSTRUCT: https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.32722.99.99.62087908186665265759322018723889952421/series/1.3.6.1.4.1.32722.99.99.305113343545091133620858778081884399262
    // -- https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.32722.99.99.62087908186665265759322018723889952421/series/1.3.6.1.4.1.32722.99.99.305113343545091133620858778081884399262/instances
    // -- [Works] https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.32722.99.99.62087908186665265759322018723889952421/series/1.3.6.1.4.1.32722.99.99.305113343545091133620858778081884399262/instances/1.3.6.1.4.1.32722.99.99.220766358736397890612249814518504349204/metadata
    // -- [Nope]  https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.32722.99.99.62087908186665265759322018723889952421/series/1.3.6.1.4.1.32722.99.99.305113343545091133620858778081884399262/instances/1.3.6.1.4.1.32722.99.99.220766358736397890612249814518504349204
    const lungCTRTSTRUCTObj = {
        caseName :'C3D - Lung CT + RTSTRUCT',
        reverseImageIds  : true,
        searchObjCT:{
            StudyInstanceUID : "1.3.6.1.4.1.32722.99.99.62087908186665265759322018723889952421",
            SeriesInstanceUID: "1.3.6.1.4.1.32722.99.99.12747108866907265023948393821781944475",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjPET:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            wadoRsRoot: '',
        },searchObjRTSGT : {
            StudyInstanceUID : "1.3.6.1.4.1.32722.99.99.62087908186665265759322018723889952421",
            SeriesInstanceUID: "1.3.6.1.4.1.32722.99.99.305113343545091133620858778081884399262",
            SOPInstanceUID   : "1.3.6.1.4.1.32722.99.99.220766358736397890612249814518504349204",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjRTSPred:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            SOPInstanceUID:'',
            wadoRsRoot: '',
        },
    }
    orthanDataURLS.push(lungCTRTSTRUCTObj);

    if (process.env.NETLIFY === "true"){
        if (verbose)        
            console.log(' - [getData()] Running on Netlify. Getting data from cloudfront for caseNumber: ', caseNumber);   
        
    }
    else {
        if (verbose)
            console.log(' - [getData()] Running on localhost. Getting data from local orthanc.')

        if (false){
            // Example 1 - ProstateX-004 
            orthanDataURLS.push({
                caseName : 'ProstateX-004',
                searchObjCT: {
                    StudyInstanceUID : '1.3.6.1.4.1.14519.5.2.1.7311.5101.170561193612723093192571245493',
                    SeriesInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7311.5101.206828891270520544417996275680',
                    wadoRsRoot       : `${window.location.origin}/dicom-web`,
                }, searchObjPET:{
                    StudyInstanceUID: '',
                    SeriesInstanceUID:'',
                    wadoRsRoot: '',
                }, searchObjRTSGT:{
                    StudyInstanceUID: '',
                    SeriesInstanceUID:'',
                    SOPInstanceUID:'',
                    wadoRsRoot: '',
                }, searchObjRTSPred:{
                    StudyInstanceUID: '',
                    SeriesInstanceUID:'',
                    SOPInstanceUID:'',
                    wadoRsRoot: '',
                },
            });
            // http://localhost:8042/dicom-web/studies/1.2.826.0.1.3680043.8.498.12735767346218857049599303193606099695
            // http://localhost:8042/dicom-web/studies/1.2.826.0.1.3680043.8.498.12735767346218857049599303193606099695/series

            // http://localhost:8042/dicom-web/studies/1.2.826.0.1.3680043.8.498.12735767346218857049599303193606099695/series/1.2.826.0.1.3680043.8.498.88933515603927308812086492012007971976
            // http://localhost:8042/dicom-web/studies/1.2.826.0.1.3680043.8.498.12735767346218857049599303193606099695/series/1.2.826.0.1.3680043.8.498.88933515603927308812086492012007971976/instances
            
            // http://localhost:8042/dicom-web/studies/1.2.826.0.1.3680043.8.498.12735767346218857049599303193606099695/series/1.2.826.0.1.3680043.8.498.88933515603927308812086492012007971976/instances/1.2.826.0.1.3680043.8.498.11644186160694132628393551238679963095
            // http://localhost:8042/dicom-web/studies/1.2.826.0.1.3680043.8.498.12735767346218857049599303193606099695/series/1.2.826.0.1.3680043.8.498.88933515603927308812086492012007971976/instances/1.2.826.0.1.3680043.8.498.11644186160694132628393551238679963095/metadata

            // Example 2 - HCAI-Interactive-XX
            //// --> (Try in postman) http://localhost:8042/dicom-web/studies/1.2.752.243.1.1.20240123155004085.1690.65801/series/1.2.752.243.1.1.20240123155004085.1700.14027/metadata
            orthanDataURLS.push({
                caseName : 'HCAI-Interactive-XX (CT + PET)',
                searchObjCT : {
                    StudyInstanceUID  : '1.2.752.243.1.1.20240123155004085.1690.65801',
                    SeriesInstanceUID : '1.2.752.243.1.1.20240123155006526.5320.21561',
                    wadoRsRoot        : `${window.location.origin}/dicom-web`
                }, searchObjPET:{
                    StudyInstanceUID : '1.2.752.243.1.1.20240123155004085.1690.65801',
                    SeriesInstanceUID: '1.2.752.243.1.1.20240123155004085.1700.14027',
                    wadoRsRoot       : `${window.location.origin}/dicom-web`
                }, searchObjRTSGT:{
                    StudyInstanceUID : '',
                    SeriesInstanceUID:'',
                    SOPInstanceUID   :'',
                    wadoRsRoot       : '',
                }, searchObjRTSPred:{
                    StudyInstanceUID : '',
                    SeriesInstanceUID:'',
                    SOPInstanceUID   :'',
                    wadoRsRoot       : '',
                },
            });

            // Example 3 - https://www.cornerstonejs.org/live-examples/segmentationvolume
            orthanDataURLS.push({
                caseName :'C3D - Abdominal CT + RTSS',
                searchObjCT:{
                    StudyInstanceUID : "1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458",
                    SeriesInstanceUID: "1.3.6.1.4.1.14519.5.2.1.40445112212390159711541259681923198035",
                    wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
                }, searchObjPET:{
                    StudyInstanceUID: '',
                    SeriesInstanceUID:'',
                    wadoRsRoot: '',
                },searchObjRTSGT : {
                    StudyInstanceUID : "1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458",
                    SeriesInstanceUID: "1.2.276.0.7230010.3.1.3.481034752.2667.1663086918.611582",
                    SOPInstanceUID   : "1.2.276.0.7230010.3.1.4.481034752.2667.1663086918.611583",
                    wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
                }, searchObjRTSPred:{
                    StudyInstanceUID: '',
                    SeriesInstanceUID:'',
                    SOPInstanceUID:'',
                    wadoRsRoot: '',
                },
            });     
        }else{
            
            const orthancData = await getOrthancPatientIds();
            for (let patientId in orthancData) {
                let patientObj = { caseName : patientId, 
                    searchObjCT     : { StudyInstanceUID : '', SeriesInstanceUID : '', SOPInstanceUID : '', wadoRsRoot : '' }, 
                    searchObjPET    : { StudyInstanceUID : '', SeriesInstanceUID : '', SOPInstanceUID : '', wadoRsRoot : '' }, 
                    searchObjRTSGT  : { StudyInstanceUID : '', SeriesInstanceUID : '', SOPInstanceUID : '', wadoRsRoot : '', }, 
                    searchObjRTSPred: { StudyInstanceUID : '', SeriesInstanceUID : '', SOPInstanceUID : '', wadoRsRoot : '', }, 
                }

                for (let study of orthancData[patientId][KEY_STUDIES]) {
                    for (let series of study[KEY_SERIES]) {
                        if (series[KEY_MODALITY] === MODALITY_CT || series[KEY_MODALITY] === MODALITY_MR) {
                            patientObj.searchObjCT.StudyInstanceUID  = study[KEY_STUDY_UID];
                            patientObj.searchObjCT.SeriesInstanceUID = series[KEY_SERIES_UID];
                            patientObj.searchObjCT.wadoRsRoot        = `${window.location.origin}/dicom-web`;
                        } else if (series[KEY_MODALITY] === MODALITY_PT) {
                            patientObj.searchObjPET.StudyInstanceUID  = study[KEY_STUDY_UID];
                            patientObj.searchObjPET.SeriesInstanceUID = series[KEY_SERIES_UID];
                            patientObj.searchObjPET.wadoRsRoot        = `${window.location.origin}/dicom-web`;
                        } else if (series[KEY_MODALITY] === MODALITY_SEG) {
                            if (series[KEY_SERIES_DESC].toLowerCase().includes('seg-gt')) {
                                patientObj.searchObjRTSGT.StudyInstanceUID  = study[KEY_STUDY_UID];
                                patientObj.searchObjRTSGT.SeriesInstanceUID = series[KEY_SERIES_UID];
                                patientObj.searchObjRTSGT.SOPInstanceUID    = series[KEY_INSTANCE_UID];
                                patientObj.searchObjRTSGT.wadoRsRoot        = `${window.location.origin}/dicom-web`;
                            } else if (series[KEY_SERIES_DESC].toLowerCase().includes('seg-pred')) {
                                patientObj.searchObjRTSPred.StudyInstanceUID  = study[KEY_STUDY_UID];
                                patientObj.searchObjRTSPred.SeriesInstanceUID = series[KEY_SERIES_UID];
                                patientObj.searchObjRTSPred.SOPInstanceUID    = series[KEY_INSTANCE_UID];
                                patientObj.searchObjRTSPred.wadoRsRoot        = `${window.location.origin}/dicom-web`;
                            } else if (series[KEY_SERIES_DESC].toLowerCase().includes('refine')) {
                                // skip this series
                            }else {
                                patientObj.searchObjRTSGT.StudyInstanceUID  = study[KEY_STUDY_UID];
                                patientObj.searchObjRTSGT.SeriesInstanceUID = series[KEY_SERIES_UID];
                                patientObj.searchObjRTSGT.SOPInstanceUID    = series[KEY_INSTANCE_UID];
                                patientObj.searchObjRTSGT.wadoRsRoot        = `${window.location.origin}/dicom-web`;
                                // patientObj.reverseImageIds = true;
                            }
                        } else if (series[KEY_MODALITY] === MODALITY_RTSTRUCT) {
                            patientObj.searchObjRTSGT.StudyInstanceUID  = study[KEY_STUDY_UID];
                            patientObj.searchObjRTSGT.SeriesInstanceUID = series[KEY_SERIES_UID];
                            patientObj.searchObjRTSGT.SOPInstanceUID    = series[KEY_INSTANCE_UID];
                            patientObj.searchObjRTSGT.wadoRsRoot        = `${window.location.origin}/dicom-web`;
                        }
                    }
                }
                orthanDataURLS.push(patientObj);
            }
        }
        
    }
}

function getIndex(volume, worldPos) {

    try{
        const {imageData} = volume;
        const index = imageData.worldToIndex(worldPos);
        return index
    } catch (error){
        console.error('   -- [getIndex()] Error: ', error);
        return undefined;
    }
}

function getValue(volume, worldPos) {

    try{
        if (volume === undefined || volume === null || volume.scalarData === undefined || volume.scalarData === null || volume.dimensions === undefined || volume.dimensions === null || volume.dimensions.length !== 3 || volume.imageData === undefined || volume.imageData === null) {
            return;
        }
        const { dimensions, scalarData } = volume;

        const index = getIndex(volume, worldPos);

        index[0] = Math.floor(index[0]);
        index[1] = Math.floor(index[1]);
        index[2] = Math.floor(index[2]);

        if (!cornerstone3D.utilities.indexWithinDimensions(index, dimensions)) {
        return;
        }

        const yMultiple = dimensions[0];
        const zMultiple = dimensions[0] * dimensions[1];

        const value = scalarData[index[2] * zMultiple + index[1] * yMultiple + index[0]];

        return value;
    }catch (error){
        console.error('   -- [getValue()] Error: ', error);
        return undefined;
    }
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

function showToast(message, duration=1000, delayToast=false) {

    if (message === '') return;

    setTimeout(() => {
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
        toast.style.border = '1px solid #fff';

        toast.style.opacity = '1';
        toast.style.transition = 'opacity 0.5s';
    
        // Add the toast to the body
        document.body.appendChild(toast);
        
        // After 'duration' milliseconds, remove the toast
        // console.log('   -- Toast: ', message);
        setTimeout(() => {
            toast.style.opacity = '0';
        }, duration);
        
        setTimeout(() => {
        document.body.removeChild(toast);
        }, duration + 500);
    }, delayToast ? 1000 : 0);

}

async function getSegmentationIdsAndUIDs() {

    // cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations()
    
    // Step 1 - Get all segmentationRepresentations
    const allSegReps = cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations() // alternatively .state.getSegmentations()
    const allSegRepsList = allSegReps['STACK_TOOL_GROUP_ID'] 
    
    // Step 2 - Get all segmentationIds and segmentationUIDs
    let allSegIds=[], allSegUIDs=[];
    if (allSegRepsList != undefined){
        allSegIds  = allSegRepsList.map(x => x.segmentationId)
        allSegUIDs = allSegRepsList.map(x => x.segmentationRepresentationUID)
    }
    
    return {allSegIds, allSegUIDs}
}

async function getSegmentationUIDforScribbleSegmentationId() {
    const {allSegIds, allSegUIDs} = await getSegmentationIdsAndUIDs();
    const idx = allSegIds.indexOf(scribbleSegmentationId);
    if (idx == -1){
        console.log('   -- [getSegmentationUIDforSegmentationId()] SegmentationId not found. Returning undefined.')
        return undefined;
    }
    return allSegUIDs[idx];
}

async function getScribbleType() {
    const fgdCheckbox = document.getElementById('fgdCheckbox');
    const bgdCheckbox = document.getElementById('bgdCheckbox');
    if (fgdCheckbox.checked) return KEY_FGD;
    if (bgdCheckbox.checked) return KEY_BGD;
    return '';
}

function setScribbleColor() {
    const fgdCheckbox = document.getElementById('fgdCheckbox');
    const bgdCheckbox = document.getElementById('bgdCheckbox');
    if (fgdCheckbox.checked) setAnnotationColor(COLOR_RGB_FGD);
    if (bgdCheckbox.checked) setAnnotationColor(COLOR_RGB_BGD);
}

async function makeRequestToPrepare(patientIdx){

    let requestStatus = false;
    try{
        
        // Step 1 - Init
        const preparePayload = {[KEY_DATA]: orthanDataURLS[patientIdx],[KEY_IDENTIFIER]: instanceName,}
        console.log(' \n ----------------- Python server (/prepare) ----------------- \n')
        console.log('   -- [makeRequestToPrepare()] preparePayload: ', preparePayload);

        // Step 2 - Make a request to /prepare
        const response = await fetch(URL_PYTHON_SERVER + ENDPOINT_PREPARE
            , {
                method: METHOD_POST, headers: HEADERS_JSON, body: JSON.stringify(preparePayload),
                credentials: 'include',
                // agent: PYTHON_SERVER_HTTPSAGENT
            }
        ); // credentials: 'include' is important for cross-origin requests
        const responseJSON = await response.json();
        console.log('   -- [makeRequestToPrepare()] response: ', response);
        console.log('   -- [makeRequestToPrepare()] response.json(): ', responseJSON);
        
        // Step 3 - Process output
        if (parseInt(response.status) == 200){
            requestStatus = true;
            serverStatusCircle.style.backgroundColor = 'green';
            serverStatusCircle.style.animation = 'none';
            setServerStatus(2, responseJSON.status);
        } else {
            setServerStatus(1, response.status + ': ' + responseJSON.detail);
        }

    } catch (error){
        requestStatus = false;
        setServerStatus(1, 'Error in /process: ' + error);
        console.log('   -- [makeRequestToPrepare()] Error: ', error);
        showToast('Python server - /prepare failed', 3000)
    }

    return requestStatus;
}

async function makeRequestToProcess(points3D, scribbleAnnotationUID, verbose=false){

    let requestStatus = false;
    let responseData  = {}
    const now = new Date();
    try{

        // Step 0 - Init=
        console.log(' \n ----------------- Python server (/process) ----------------- \n')
        console.log('   -- [makeRequestToProcess()] patientIdx: ', global.patientIdx);
        console.log('   -- [makeRequestToProcess()] caseName: ', orthanDataURLS[global.patientIdx]['caseName']);

        // Step 1 - Make a request to /process
        const scribbleType = await getScribbleType();
        const processPayload = {
            [KEY_DATA]: {[KEY_POINTS_3D]: points3D, [KEY_SCRIB_TYPE]:scribbleType, [KEY_CASE_NAME]: orthanDataURLS[global.patientIdx]['caseName'],}
            , [KEY_IDENTIFIER]: instanceName,
        }
        await showLoaderAnimation();
        
        console.log('   -- [makeRequestToProcess()] processPayload: ', processPayload);
        try{
            const response = await fetch(URL_PYTHON_SERVER + ENDPOINT_PROCESS, {method: METHOD_POST, headers: HEADERS_JSON, body: JSON.stringify(processPayload), credentials: 'include',}); // credentials: 'include' is important for cross-origin requests
            const responseJSON = await response.json();
            requestStatus = true;
            console.log('   -- [makeRequestToProcess()] response       : ', response);
            console.log('   -- [makeRequestToProcess()] response.json(): ', responseJSON);
            
            // Step 2 - Remove old scribble annotation
            if (verbose) console.log('\n --------------- Removing old annotation ...  ---------------: ', scribbleAnnotationUID)
            await handleStuffAfterProcessEndpoint(scribbleAnnotationUID);

            if (response.status == 200){
                responseData = responseJSON.responseData    

                // Step 3 - Remove old segmentation
                const nowPostAIScribbleResponseDate = new Date();
                if (verbose) console.log('\n --------------- Removing old segmentation ...  ---------------: ')
                const allSegObjs = cornerstone3DTools.segmentation.state.getSegmentations();
                const allSegRepsObjs = cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations()[toolGroupIdContours];
                allSegObjs.forEach(segObj => {
                    if (segObj.segmentationId.includes(predSegmentationIdBase)){
                        if (verbose)console.log('   -- [makeRequestToProcess()] Removing segObj: ', segObj.segmentationId);
                        cornerstone3DTools.segmentation.state.removeSegmentation(segObj.segmentationId);
                        const thisSegRepsObj = allSegRepsObjs.filter(obj => obj.segmentationId === segObj.segmentationId)[0]
                        if (verbose)console.log('   -- [makeRequestToProcess()] Removing segRepsObj: ', thisSegRepsObj);
                        cornerstone3DTools.segmentation.removeSegmentationsFromToolGroup(toolGroupIdContours, [thisSegRepsObj.segmentationRepresentationUID,], true);
                        if (segObj.type == SEG_TYPE_LABELMAP){
                            cornerstone3D.cache.removeVolumeLoadObject(segObj.segmentationId);
                        }
                    }
                });
                if (verbose) console.log('   -- [makeRequestToProcess()] new allSegObjs: ', cornerstone3DTools.segmentation.state.getSegmentations())
                if (verbose) console.log('   -- [makeRequestToProcess()] new     allSegRepsObjs: ', cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations())

                if (verbose) console.log('\n --------------- Adding new segmentation ...  ---------------: ')
                try{
                    if (verbose) console.log(' - responseData: ', responseData)
                    const nowDcmSEGFetch = new Date();
                    await fetchAndLoadDCMSeg(responseData, global.imageIdsCT, MASK_TYPE_REFINE)
                    const totalDcmSEGFetchSeconds = (new Date() - nowDcmSEGFetch) / 1000;
                    console.log('   -- [makeRequestToProcess()] Round-trip DcmSEG fetch completed in ', totalDcmSEGFetchSeconds, ' s');
                } catch (error){
                    console.error(' - [loadData()] Error in makeRequestToProcess(responseData, global.imageIdsCT, MASK_TYPE_PRED): ', error);
                    showToast('Error in loading refined segmentation data', 3000);
                }
                
                const totalPostAIScribbleResponseSeconds = (new Date() - nowPostAIScribbleResponseDate) / 1000;
                const totalAIScribbleProcessingSeconds = (new Date() - now) / 1000;
                showToast(`AI Processing completed in ${totalAIScribbleProcessingSeconds} s`, 3000);
                console.log('   -- [makeRequestToProcess()] Round-trip AI Processing completed in ', totalAIScribbleProcessingSeconds, ' s with ', totalPostAIScribbleResponseSeconds, ' s post-AI scribble response processing');
            } else {
                showToast('Python server - /process failed <br/>' + responseJSON.detail, 30000)
                await handleStuffAfterProcessEndpoint(scribbleAnnotationUID);
            }

        } catch (error){
            requestStatus = false;
            console.log('   -- [makeRequestToProcess()] Error: ', error);
            showToast('Python server - /process failed', 3000)
            await handleStuffAfterProcessEndpoint(scribbleAnnotationUID);
        }

    } catch (error){
        requestStatus = false;
        console.log('   -- [makeRequestToProcess()] Error: ', error);
        showToast('Python server - /process failed', 3000)
        await handleStuffAfterProcessEndpoint(scribbleAnnotationUID);
    }

    return {requestStatus, responseData};
}

async function handleStuffAfterProcessEndpoint(scribbleAnnotationUID){
    cornerstone3DTools.annotation.state.removeAnnotation(scribbleAnnotationUID);
    renderNow();
    await unshowLoaderAnimation();
}

function getAllPlanFreeHandRoiAnnotations() {
    const allAnnotations = cornerstone3DTools.annotation.state.getAllAnnotations();
    const planFreeHandRoiAnnotations = allAnnotations.filter(annotation => annotation.metadata.toolName === cornerstone3DTools.PlanarFreehandROITool.toolName);
    return planFreeHandRoiAnnotations;
}

function removeAllPlanFreeHandRoiAnnotations() {
    const allAnnotations = cornerstone3DTools.annotation.state.getAllAnnotations();
    allAnnotations.forEach(annotation => {
        console.log('   -- [removeAllPlanFreeHandRoiAnnotations()] annotation: ', annotation);
        if (annotation.metadata.toolName === cornerstone3DTools.PlanarFreehandROITool.toolName) {
            cornerstone3DTools.annotation.state.removeAnnotation(annotation.annotationUID);
        }
    });

}

function setAnnotationColor(rgbColorString){
    // rgbColorString = 'rgb(255,0,0)';
    
    // Step 1 - Get styles
    let styles = cornerstone3DTools.annotation.config.style.getDefaultToolStyles();
    
    // Step 2 - Set the color
    styles.global.color            = rgbColorString;
    styles.global.colorHighlighted = rgbColorString;
    styles.global.colorLocked      = rgbColorString;
    styles.global.colorSelected    = rgbColorString;
    
    // Step 3 - set stype
    cornerstone3DTools.annotation.config.style.setDefaultToolStyles(styles);

}

async function setupDropDownMenu(orthanDataURLS, patientIdx) {

    const cases = Array.from({length: orthanDataURLS.length}, (_, i) => orthanDataURLS[i].caseName).filter(caseName => caseName.length > 0);
    
    cases.forEach((caseName, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.text = index + ' - ' + caseName;
        caseSelectionHTML.appendChild(option);

        if (index == patientIdx) 
            option.selected = true;
    });

    caseSelectionHTML.selectedIndex = patientIdx;
}

function calculatePlaneNormal(imageOrientation) {
    const rowCosineVec = vec3.fromValues(
      imageOrientation[0],
      imageOrientation[1],
      imageOrientation[2]
    );
    const colCosineVec = vec3.fromValues(
      imageOrientation[3],
      imageOrientation[4],
      imageOrientation[5]
    );
    return vec3.cross(vec3.create(), rowCosineVec, colCosineVec);
}
  
function sortImageIds(imageIds) {
    const { imageOrientationPatient } = cornerstone3D.metaData.get(
      'imagePlaneModule',
      imageIds[0]
    );
    const scanAxisNormal = calculatePlaneNormal(imageOrientationPatient);
    const { sortedImageIds } = cornerstone3D.utilities.sortImageIdsAndGetSpacing(
      imageIds,
      scanAxisNormal
    );
    return sortedImageIds;
}

function setSegmentationIndexColor(paramToolGroupId, paramSegUID, segmentationIndex, colorRGBAArray) {
    
    cornerstone3DTools.segmentation.config.color.setColorForSegmentIndex(paramToolGroupId, paramSegUID, segmentationIndex, colorRGBAArray);
    // cornerstone3DTools.segmentation.config.color.setColorForSegmentIndex(paramToolGroupId, paramSegUID, segmentationIndex, [0,255,0,255]);
}

function formatPoints(data){
	let points = [];
	if(data.length == 0){
		return;
	}
	
	for(var i=0; i<data.length / 3; i++){
		let point = data.slice(i * 3, i * 3 + 3)
		points.push([parseFloat(point[0]),parseFloat(point[1]),parseFloat(point[2])]);
	}
	
	return points;
}

function getActiveSegmentationObj(){

    // use map to apply the function getActiveSegmentation to each key of allSegIdsAndUIDs
    // const allSegIdsAndUIDs = cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations();
    // let res = Object.keys(allSegIdsAndUIDs).map(key => cornerstone3DTools.segmentation.activeSegmentation.getActiveSegmentation(allSegIdsAndUIDs[key]));
    // return res
    let res=  {}
    const allSegIdsAndUIDs = cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations();
    Object.keys(allSegIdsAndUIDs).forEach((key) => {
        res[key] = [];
        allSegIdsAndUIDs[key].forEach((segObj) => {
            if (segObj.active == true){
                res[key].push(segObj);
            }
        });
    });

    return res;
}

function setAllContouringToolsPassive() {

    const toolGroupContours         = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupIdContours);
    // const toolGroupScribble         = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupIdScribble);
    const windowLevelTool           = cornerstone3DTools.WindowLevelTool;
    // const planarFreehandROITool2     = cornerstone3DTools.PlanarFreehandROITool; // some issue -- Cannot access '__WEBPACK_DEFAULT_EXPORT__' before initialization

    toolGroupContours.setToolPassive(windowLevelTool.toolName);
    if (MODALITY_CONTOURS === MODALITY_SEG){
        toolGroupContours.setToolPassive(strBrushCircle);
        toolGroupContours.setToolPassive(strEraserCircle);
    } else if (MODALITY_CONTOURS === MODALITY_RTSTRUCT){
        // const planarFreeHandContourTool = cornerstone3DTools.PlanarFreehandContourSegmentationTool; // some issue -- Cannot access '__WEBPACK_DEFAULT_EXPORT__' before initialization
        const sculptorTool              = cornerstone3DTools.SculptorTool;
        // toolGroupContours.setToolPassive(planarFreeHandContourTool.toolName);
        toolGroupContours.setToolPassive(sculptorTool.toolName);
    }
    // toolGroupContours.setToolPassive(planarFreehandROITool2.toolName);  

}

function showSliceIds(){

    try{
        const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
        viewportIds.forEach((viewportId) => {
            const viewport               = renderingEngine.getViewport(viewportId);
            const imageIdxForViewport    = viewport.getCurrentImageIdIndex()
            const totalImagesForViewPort = viewport.getNumberOfSlices()
            if (viewportId == axialID)
                axialSliceDiv.innerHTML = `Axial: ${imageIdxForViewport+1}/${totalImagesForViewPort}`;
            else if (viewportId == sagittalID)
                sagittalSliceDiv.innerHTML = `Sagittal: ${imageIdxForViewport+1}/${totalImagesForViewPort}`;
            else if (viewportId == coronalID)
                coronalSliceDiv.innerHTML = `Coronal: ${imageIdxForViewport+1}/${totalImagesForViewPort}`;
        });
    } catch (error){
        console.error('   -- [showSliceIds()] Error: ', error);
    }
}

function showUnshowAllSegmentations() {
    const toolGroupContours = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupIdContours);
    const segmentationDisplayTool = cornerstone3DTools.SegmentationDisplayTool;

    if (toolGroupContours.toolOptions[segmentationDisplayTool.toolName].mode === MODE_ENABLED){
        toolGroupContours.setToolDisabled(segmentationDisplayTool.toolName);
    } else {
        toolGroupContours.setToolEnabled(segmentationDisplayTool.toolName);
    }
}

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

    // // Step 2 - Get tools
    const windowLevelTool           = cornerstone3DTools.WindowLevelTool;
    const panTool                   = cornerstone3DTools.PanTool;
    const zoomTool                  = cornerstone3DTools.ZoomTool;
    const stackScrollMouseWheelTool = cornerstone3DTools.StackScrollMouseWheelTool;
    const probeTool                 = cornerstone3DTools.ProbeTool;
    const referenceLinesTool        = cornerstone3DTools.ReferenceLines;
    const segmentationDisplayTool   = cornerstone3DTools.SegmentationDisplayTool;
    const brushTool                 = cornerstone3DTools.BrushTool;
    const planarFreeHandRoiTool     = cornerstone3DTools.PlanarFreehandROITool;
    const planarFreeHandContourTool = cornerstone3DTools.PlanarFreehandContourSegmentationTool; 
    const sculptorTool              = cornerstone3DTools.SculptorTool;
    // const toolState      = cornerstone3DTools.state;
    // const {segmentation} = cornerstone3DTools;

    // Step 3 - init tools
    cornerstone3DTools.addTool(windowLevelTool);
    cornerstone3DTools.addTool(panTool);
    cornerstone3DTools.addTool(zoomTool);
    cornerstone3DTools.addTool(stackScrollMouseWheelTool);
    cornerstone3DTools.addTool(probeTool);
    cornerstone3DTools.addTool(referenceLinesTool);
    cornerstone3DTools.addTool(segmentationDisplayTool);
    cornerstone3DTools.addTool(planarFreeHandRoiTool);
    if (MODALITY_CONTOURS == MODALITY_SEG)
        cornerstone3DTools.addTool(brushTool);
    else if (MODALITY_CONTOURS == MODALITY_RTSTRUCT){
        cornerstone3DTools.addTool(planarFreeHandContourTool);
        cornerstone3DTools.addTool(sculptorTool);
    }
     
    // Step 4.1 - Make toolGroupContours
    const toolGroupContours = cornerstone3DTools.ToolGroupManager.createToolGroup(toolGroupIdContours);
    toolGroupContours.addTool(windowLevelTool.toolName);
    toolGroupContours.addTool(panTool.toolName);
    toolGroupContours.addTool(zoomTool.toolName);
    toolGroupContours.addTool(stackScrollMouseWheelTool.toolName);
    toolGroupContours.addTool(probeTool.toolName);
    toolGroupContours.addTool(referenceLinesTool.toolName);
    toolGroupContours.addTool(segmentationDisplayTool.toolName);

    if (MODALITY_CONTOURS == MODALITY_SEG){
        toolGroupContours.addTool(brushTool.toolName);
        toolGroupContours.addToolInstance(strBrushCircle, brushTool.toolName, { activeStrategy: 'FILL_INSIDE_CIRCLE', brushSize:INIT_BRUSH_SIZE}) ;
        toolGroupContours.addToolInstance(strEraserCircle, brushTool.toolName, { activeStrategy: 'ERASE_INSIDE_CIRCLE', brushSize:INIT_BRUSH_SIZE});
    }
    else if (MODALITY_CONTOURS == MODALITY_RTSTRUCT){
        toolGroupContours.addTool(planarFreeHandContourTool.toolName);
        toolGroupContours.addTool(sculptorTool.toolName);
    }

    // Step 4.2 - Make toolGroupScribble
    // const toolGroupScribble = cornerstone3DTools.ToolGroupManager.createToolGroup(toolGroupIdScribble);
    toolGroupContours.addTool(planarFreeHandRoiTool.toolName);

    // Step 5 - Set toolGroup(s) elements as active/passive
    toolGroupContours.setToolPassive(windowLevelTool.toolName);// Left Click
    toolGroupContours.setToolActive(panTool.toolName, {bindings: [{mouseButton: cornerstone3DTools.Enums.MouseBindings.Auxiliary, },],}); // Middle Click
    toolGroupContours.setToolActive(zoomTool.toolName, {bindings: [{mouseButton: cornerstone3DTools.Enums.MouseBindings.Secondary, },],}); // Right Click    
    toolGroupContours.setToolActive(stackScrollMouseWheelTool.toolName);
    toolGroupContours.setToolEnabled(probeTool.toolName);
    toolGroupContours.setToolEnabled(referenceLinesTool.toolName);
    toolGroupContours.setToolConfiguration(referenceLinesTool.toolName, {sourceViewportId: axialID,});
    [axialDiv, sagittalDiv, coronalDiv].forEach((viewportDiv, index) => {
        viewportDiv.addEventListener('mouseenter', function() {
            toolGroupContours.setToolConfiguration(referenceLinesTool.toolName, {sourceViewportId: viewportIds[index]});
        });
    });

    // Step 5.2 - Set all contouring tools as passive
    toolGroupContours.setToolEnabled(segmentationDisplayTool.toolName);
    if (MODALITY_CONTOURS == MODALITY_SEG){
        // toolGroupContours.setToolPassive(brushTool.toolName);
        toolGroupContours.setToolPassive(strBrushCircle); // , { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });
        toolGroupContours.setToolPassive(strEraserCircle); // , { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });
    } else if (MODALITY_CONTOURS == MODALITY_RTSTRUCT){
        toolGroupContours.setToolPassive(planarFreeHandContourTool.toolName);
        toolGroupContours.setToolPassive(sculptorTool.toolName);
    }

    // Step 5.3 - Set toolGroupIdContours elements as passive
    toolGroupContours.setToolPassive(planarFreeHandRoiTool.toolName);
    toolGroupContours.setToolConfiguration(planarFreeHandRoiTool.toolName, {calculateStats: false});

    // Step 6 - Add events
    // Listen for keydown event
    window.addEventListener('keydown', function(event) {
        // For brush tool radius        
        if (MODALITY_CONTOURS == MODALITY_SEG){
            const toolGroupContours = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupIdContours);
            if (toolGroupContours.toolOptions[strBrushCircle].mode === MODE_ACTIVE || toolGroupContours.toolOptions[strEraserCircle].mode === MODE_ACTIVE){
                const segUtils       = cornerstone3DTools.utilities.segmentation;
                let initialBrushSize = segUtils.getBrushSizeForToolGroup(toolGroupIdContours);
                if (event.key === '+')
                    segUtils.setBrushSizeForToolGroup(toolGroupIdContours, initialBrushSize + 1);
                else if (event.key === '-'){
                    if (initialBrushSize > 1)
                        segUtils.setBrushSizeForToolGroup(toolGroupIdContours, initialBrushSize - 1);
                }
                let newBrushSize = segUtils.getBrushSizeForToolGroup(toolGroupIdContours);
                showToast(`Brush size: ${newBrushSize}`);
            }
        }

        if (event.key === 'r'){
            resetView();
        }
    });
    
}

function setInnerHTMLForSliceId(activeViewportId, imageIdxForViewport, totalImagesForViewPort){
    
    if (activeViewportId == axialID){
        // console.log('Axial: ', imageIdxForViewport, totalImagesForViewPort)
        axialSliceDiv.innerHTML = `Axial: ${imageIdxForViewport+1}/${totalImagesForViewPort}`
    } else if (activeViewportId == sagittalID){
        // console.log('Sagittal: ', imageIdxForViewport, totalImagesForViewPort)
        sagittalSliceDiv.innerHTML = `Sagittal: ${imageIdxForViewport+1}/${totalImagesForViewPort}`
    } else if (activeViewportId == coronalID){
        // console.log('Coronal: ', imageIdxForViewport, totalImagesForViewPort)
        coronalSliceDiv.innerHTML = `Coronal: ${imageIdxForViewport+1}/${totalImagesForViewPort}`
    }

}

function setMouseAndKeyboardEvents(){

    // handle scroll event
    document.addEventListener('wheel', function(evt) {
        if (evt.target.className == 'cornerstone-canvas') {
            const {viewport: activeViewport, viewportId: activeViewportId} = cornerstone3D.getEnabledElement(evt.target.offsetParent.parentElement);
            // console.log(activeViewport, activeViewportId)
            const imageIdxForViewport = activeViewport.getCurrentImageIdIndex()
            const totalImagesForViewPort = activeViewport.getNumberOfSlices()
            setInnerHTMLForSliceId(activeViewportId, imageIdxForViewport, totalImagesForViewPort)
        }
    });

    // handle left-arrow and right-arrow keydown event
    document.addEventListener('keydown', function(evt) {
        
        // For slice traversal
        if (viewportIds.includes(evt.target.id)){
            if (evt.key == SHORTCUT_KEY_ARROW_LEFT || evt.key == SHORTCUT_KEY_ARROW_RIGHT){

                try {

                    // Step 1 - Init
                    const {viewport: activeViewport, viewportId: activeViewportId} = cornerstone3D.getEnabledElement(evt.target);
                    const imageIdxForViewport    = activeViewport.getCurrentImageIdIndex()
                    const totalImagesForViewPort = activeViewport.getNumberOfSlices()
                    let viewportViewReference  = activeViewport.getViewReference()
                    
                    // Step 2 - Handle keydown event
                    let newImageIdxForViewportForHTML = imageIdxForViewport;
                    let newImageIdxForViewport = imageIdxForViewport;
                    if (evt.key == SHORTCUT_KEY_ARROW_LEFT){
                        newImageIdxForViewportForHTML = imageIdxForViewport - 1;
                    } else if (evt.key == SHORTCUT_KEY_ARROW_RIGHT){
                        newImageIdxForViewportForHTML = imageIdxForViewport + 1;
                    }
                    if (newImageIdxForViewportForHTML < 0) newImageIdxForViewportForHTML = 0;
                    if (newImageIdxForViewportForHTML > totalImagesForViewPort-1) newImageIdxForViewportForHTML = totalImagesForViewPort - 1;
                    if (activeViewportId == sagittalID){
                        newImageIdxForViewport = newImageIdxForViewportForHTML
                    } else if (activeViewportId == coronalID || activeViewportId == axialID){
                        if (evt.key == SHORTCUT_KEY_ARROW_LEFT){
                            newImageIdxForViewport = (totalImagesForViewPort-1) - (imageIdxForViewport - 1);
                        } else if (evt.key == SHORTCUT_KEY_ARROW_RIGHT){
                            newImageIdxForViewport = (totalImagesForViewPort-1) - (imageIdxForViewport + 1);
                        }
                        // if (newImageIdxForViewport < 0) newImageIdxForViewport = 0;
                        // if (newImageIdxForViewport > totalImagesForViewPort-1) newImageIdxForViewport = totalImagesForViewPort - 1;
                    }

                    // Step 3 - Update the viewport
                    // console.log('   -- [',evt.key,'] imageIdxForViewport: ', imageIdxForViewport, ' --> ',newImageIdxForViewport, ' || cameraFocalPoint: ', viewportViewReference.cameraFocalPoint, ' || sliceIndex: ', viewportViewReference.sliceIndex, '(',(totalImagesForViewPort-1)-(imageIdxForViewport),')')
                    // if (evt.key == 'ArrowLeft')
                    //     console.log('         ----> ', (totalImagesForViewPort-1)-(imageIdxForViewport-1))
                    // else if (evt.key == 'ArrowRight')
                    //     console.log('         ----> ', (totalImagesForViewPort-1)-(imageIdxForViewport+1))
                    setInnerHTMLForSliceId(activeViewportId, newImageIdxForViewportForHTML, totalImagesForViewPort)
                    viewportViewReference.sliceIndex = newImageIdxForViewport;
                    activeViewport.setViewReference(viewportViewReference);
                    renderNow();
                } catch (error){
                    console.error('   -- [keydown] Error: ', error);
                }
            }
        }

        // For show/unshow contours
        if (evt.key === SHORTCUT_KEY_C) {
            showUnshowAllSegmentations()
        }
    });
}

function setContouringButtonsLogic(verbose=true){

    // Step 0 - Init
    const toolGroupContours         = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupIdContours);
    // const toolGroupScribble         = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupIdScribble);
    const windowLevelTool           = cornerstone3DTools.WindowLevelTool;
    const planarFreeHandContourTool = cornerstone3DTools.PlanarFreehandContourSegmentationTool;
    const sculptorTool              = cornerstone3DTools.SculptorTool;
    const planarFreehandROITool     = cornerstone3DTools.PlanarFreehandROITool;
    
    // Step 2 - Add event listeners to buttons        
    try{
        [windowLevelButton, contourSegmentationToolButton, sculptorToolButton, editBaseContourViaScribbleButton].forEach((buttonHTML, buttonId) => {
            if (buttonHTML === null) return;
            
            buttonHTML.addEventListener('click', async function() {
                if (buttonId === 0) { // windowLevelButton
                    toolGroupContours.setToolActive(windowLevelTool.toolName, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });              
                    if (MODALITY_CONTOURS == MODALITY_SEG){
                        toolGroupContours.setToolPassive(strBrushCircle);
                        toolGroupContours.setToolPassive(strEraserCircle);
                    } else if (MODALITY_CONTOURS == MODALITY_RTSTRUCT){
                        toolGroupContours.setToolPassive(planarFreeHandContourTool.toolName);
                        toolGroupContours.setToolPassive(sculptorTool.toolName);
                    }
                    toolGroupContours.setToolPassive(planarFreehandROITool.toolName);  
                    
                    setButtonBoundaryColor(windowLevelButton, true);
                    setButtonBoundaryColor(contourSegmentationToolButton, false);
                    setButtonBoundaryColor(sculptorToolButton, false);
                    setButtonBoundaryColor(editBaseContourViaScribbleButton, false);
                    
                }
                else if (buttonId === 1) { // contourSegmentationToolButton
                    
                    // Step 1 - Set tools as active/passive
                    toolGroupContours.setToolPassive(windowLevelTool.toolName); 
                    if (MODALITY_CONTOURS == MODALITY_SEG){
                        toolGroupContours.setToolActive(strBrushCircle, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });  
                        toolGroupContours.setToolPassive(strEraserCircle);
                    } else if (MODALITY_CONTOURS == MODALITY_RTSTRUCT){
                        toolGroupContours.setToolActive(planarFreeHandContourTool.toolName, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });
                        toolGroupContours.setToolPassive(sculptorTool.toolName);
                    }
                    toolGroupContours.setToolPassive(planarFreehandROITool.toolName);
                    
                    // Step 2 - Set active segId and segRepId
                    const allSegIdsAndUIDs =  cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations();
                    if (verbose) console.log(' - [setContouringButtonsLogic()] allSegIdsAndUIDs: ', allSegIdsAndUIDs, ' || predSegmentationUIDs: ', global.predSegmentationUIDs);
                    if (global.predSegmentationUIDs != undefined){
                        if (global.predSegmentationUIDs.length != 0){
                            cornerstone3DTools.segmentation.segmentIndex.setActiveSegmentIndex(global.predSegmentationId, 1);
                            cornerstone3DTools.segmentation.activeSegmentation.setActiveSegmentationRepresentation(toolGroupIdContours, global.predSegmentationUIDs[0]);

                            // Step 3 - Set boundary colors 
                            setButtonBoundaryColor(windowLevelButton, false);
                            setButtonBoundaryColor(contourSegmentationToolButton, true);
                            setButtonBoundaryColor(sculptorToolButton, false);
                            setButtonBoundaryColor(editBaseContourViaScribbleButton, false);

                        } else {
                            showToast('Issue with accessing predSegmentationUIDs: ', global.predSegmentationUIDs)
                            setAllContouringToolsPassive();
                        }
                    } else {
                        showToast('Issue with accessing predSegmentationUIDs: ', global.predSegmentationUIDs)
                        setAllContouringToolsPassive();
                    }
                }
                else if (buttonId === 2) { // sculptorToolButton

                    // Step 1 - Set tools as active/passive
                    toolGroupContours.setToolPassive(windowLevelTool.toolName);
                    if (MODALITY_CONTOURS == MODALITY_SEG){
                        toolGroupContours.setToolPassive(strBrushCircle);
                        toolGroupContours.setToolActive(strEraserCircle, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });
                    } else if (MODALITY_CONTOURS == MODALITY_RTSTRUCT){
                        toolGroupContours.setToolPassive(planarFreeHandContourTool.toolName);
                        toolGroupContours.setToolActive(sculptorTool.toolName, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });
                    }
                    toolGroupContours.setToolPassive(planarFreehandROITool.toolName);
                    
                    // Step 2 - Set active segId and segRepId
                    const allSegIdsAndUIDs =  cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations();
                    if (verbose) console.log(' - [setContouringButtonsLogic()] allSegIdsAndUIDs: ', allSegIdsAndUIDs, ' || predSegmentationUIDs: ', global.predSegmentationUIDs);
                    if (global.predSegmentationUIDs != undefined){
                        if (global.predSegmentationUIDs.length != 0){
                            cornerstone3DTools.segmentation.segmentIndex.setActiveSegmentIndex(global.predSegmentationId, 1);
                            cornerstone3DTools.segmentation.activeSegmentation.setActiveSegmentationRepresentation(toolGroupIdContours, global.predSegmentationUIDs[0]);

                            // Step 3 - Set boundary colors
                            setButtonBoundaryColor(windowLevelButton, false);
                            setButtonBoundaryColor(contourSegmentationToolButton, false);
                            setButtonBoundaryColor(sculptorToolButton, true);
                            setButtonBoundaryColor(editBaseContourViaScribbleButton, false);
                        }
                        else{
                            setAllContouringToolsPassive();
                            showToast('Issue with accessing predSegmentationUIDs: ', global.predSegmentationUIDs)
                        }
                    }else{
                        setAllContouringToolsPassive();
                        showToast('Issue with accessing predSegmentationUIDs: ', global.predSegmentationUIDs)
                    }
                }
                else if (buttonId === 3) { // editBaseContourViaScribbleButton
                    
                    toolGroupContours.setToolPassive(windowLevelTool.toolName);
                    if (MODALITY_CONTOURS == MODALITY_SEG){
                        toolGroupContours.setToolPassive(strBrushCircle);
                        toolGroupContours.setToolPassive(strEraserCircle);
                    } else if (MODALITY_CONTOURS == MODALITY_RTSTRUCT){
                        toolGroupContours.setToolPassive(planarFreeHandContourTool.toolName);
                        toolGroupContours.setToolPassive(sculptorTool.toolName);
                    }
                    toolGroupContours.setToolActive(planarFreehandROITool.toolName, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });
                    
                    const allSegIdsAndUIDs =  cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations();
                    console.log(' - [setContouringButtonsLogic()] allSegIdsAndUIDs: ', allSegIdsAndUIDs, ' || scribbleSegmentationUIDs: ', global.scribbleSegmentationUIDs);
                    if (global.scribbleSegmentationUIDs != undefined){
                        if (global.scribbleSegmentationUIDs.length != 0){
                            cornerstone3DTools.segmentation.activeSegmentation.setActiveSegmentationRepresentation(toolGroupIdContours, global.scribbleSegmentationUIDs[0]);
                            if (fgdCheckbox.checked) setAnnotationColor(COLOR_RGB_FGD);
                            if (bgdCheckbox.checked) setAnnotationColor(COLOR_RGB_BGD);

                            // Step 3 - Set boundary colors
                            setButtonBoundaryColor(windowLevelButton, false);
                            setButtonBoundaryColor(contourSegmentationToolButton, false);
                            setButtonBoundaryColor(sculptorToolButton, false);
                            setButtonBoundaryColor(editBaseContourViaScribbleButton, true);
                        } else{
                            showToast('Issue with accessing scribbleSegmentationUIDs: ', global.scribbleSegmentationUIDs)
                            setAllContouringToolsPassive();
                        }
                    }else{
                        showToast('Issue with accessing scribbleSegmentationUIDs: ', global.scribbleSegmentationUIDs)
                        setAllContouringToolsPassive();
                    }
                }
            });
        });
    } catch (error){
        setAllContouringToolsPassive();
        console.log('   -- [setContouringButtonsLogic()] Error: ', error);
    }

    // Step 3 - Add event listeners for mouseup event
    [axialDiv, sagittalDiv, coronalDiv].forEach((viewportDiv, index) => {
        viewportDiv.addEventListener('mouseup', function() {
            setTimeout(async () => {
                const freehandRoiToolMode = toolGroupContours.toolOptions[planarFreehandROITool.toolName].mode;
                if (freehandRoiToolMode === MODE_ACTIVE){
                    const scribbleAnnotations = getAllPlanFreeHandRoiAnnotations()
                    if (scribbleAnnotations.length > 0){
                        const scribbleAnnotationUID = scribbleAnnotations[scribbleAnnotations.length - 1].annotationUID;
                        if (scribbleAnnotations.length > 0){
                            const polyline           = scribbleAnnotations[0].data.contour.polyline;
                            const points3D = polyline.map(function(point) {
                                return getIndex(cornerstone3D.cache.getVolume(volumeIdCT), point);
                            });
                            const points3DInt = points3D.map(x => x.map(y => Math.floor(y)));
                            await makeRequestToProcess(points3DInt, scribbleAnnotationUID);
                        }
                    } else {
                        console.log(' - [setContouringButtonsLogic()] scribbleAnnotations: ', scribbleAnnotations);
                        renderNow();
                    }
                } else {
                    console.log('   -- [setContouringButtonsLogic()] freehandRoiToolMode: ', freehandRoiToolMode);
                    showToast('Please enable the AI-scribble button to draw contours');
                }
            }, 100);
        });
    });
}

async function setRenderingEngineAndViewports(){

    const renderingEngine = new cornerstone3D.RenderingEngine(renderingEngineId);

    // Step 2.5.1 - Add image planes to rendering engine
    const viewportInputs = [
        {element: axialDiv   , viewportId: axialID   , type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.AXIAL},},
        {element: sagittalDiv, viewportId: sagittalID, type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.SAGITTAL},},
        // {element: sagittalDiv, viewportId: sagittalID, type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.AXIAL},},  // doing this screws up RTSTRUCT. Why is RTSTRUCT always displaying on the first viewportID
        // {element: axialDiv   , viewportId: axialID   , type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.SAGITTAL},},
        {element: coronalDiv , viewportId: coronalID , type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.CORONAL},},
    ]
    renderingEngine.setViewports(viewportInputs);
    
    // Step 2.5.2 - Add toolGroupIdContours to rendering engine
    const toolGroup = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupIdContours);
    viewportIds.forEach((viewportId) =>
        toolGroup.addViewport(viewportId, renderingEngineId)
    );

    // return {renderingEngine};
}

function renderNow(){
    try {
        // console.log(cornerstone3DTools.ToolGroupManager getToolGroup(toolGroupId)
        const viewportsInfo = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupIdContours).getViewportsInfo();
        viewportsInfo.forEach(({ viewportId, renderingEngineId }) => {
          const enabledElement = cornerstone3D.getEnabledElementByIds(
            viewportId,
            renderingEngineId
          );
          enabledElement.viewport.render();
        });
    } catch {
        console.error('Error in renderNow()');
    }
}

async function fetchAndLoadDCMSeg(searchObj, imageIds, maskType){

    // Step 1.1 - Create client Obj
    const client = new dicomWebClient.api.DICOMwebClient({
        url: searchObj.wadoRsRoot
    });

    // Step 1.2 - Fetch and created seg/rtstruct dataset
    let arrayBuffer;
    let dataset;
    try{

        // NOTE: only works for modality=SEG, and not modality=RTSTRUCT
        arrayBuffer = await client.retrieveInstance({
            studyInstanceUID: searchObj.StudyInstanceUID,
            seriesInstanceUID: searchObj.SeriesInstanceUID,
            sopInstanceUID: searchObj.SOPInstanceUID
        });
        const dicomData = dcmjs.data.DicomMessage.readFile(arrayBuffer);
        dataset         = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict); 
        dataset._meta   = dcmjs.data.DicomMetaDictionary.namifyDataset(dicomData.meta);

    } catch (error){
        try{
            const dicomMetaData = await client.retrieveInstanceMetadata({
                studyInstanceUID: searchObj.StudyInstanceUID,
                seriesInstanceUID: searchObj.SeriesInstanceUID,
                sopInstanceUID: searchObj.SOPInstanceUID
            });

            dataset         = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomMetaData); 

        } catch (error){
            console.log('   -- [fetchAndLoadDCMSeg()] Error: ', error);
            return;
        }
    }

    if (dataset === undefined){
        console.log('   -- [fetchAndLoadDCMSeg()] dataset is undefined. Returning ...');
        return;
    }
    
    // console.log('\n - [fetchAndLoadDCMSeg([',maskType,'])] dataset: ', dataset)
    if (dataset.Modality === 'RTSTRUCT'){
        
        // Step 2 - Get main RTSTRUCT tags
        const roiSequence = dataset.StructureSetROISequence; // (3006,0020) -- contains ROI name, number, algorithm
        const roiObservationSequence = dataset.RTROIObservationsSequence; // (3006,0080) -- contains ROI name, number and type={ORGAN,PTV,CTV etc}
        const contourData = dataset.ROIContourSequence; // (3006,0039) -- contains the polyline data
        
        // Step 3 - Loop over roiSequence and get the ROI name, number and color
        let thisROISequence = [];
        let thisROINumbers  = [];
        let contourSets     = [];
        roiSequence.forEach((item, index) => {
            let ROINumber = item.ROINumber
			let ROIName = item.ROIName
			let color = []
			for(var i=0;i<contourData.length;i++){
				if(contourData[i].ReferencedROINumber == ROINumber){
					color = contourData[i].ROIDisplayColor
                    break;
				}
			}
			
			thisROISequence.push({
				ROINumber,
				ROIName,
				color: color.join(",")
			});
			
			thisROINumbers.push(ROINumber);
		})
        
        // Step 4 - Loop over contourData(points)
        contourData.forEach((item, index) => {
			let color    = item.ROIDisplayColor
            let number   = item.ReferencedROINumber;		
			let sequence = item.ContourSequence;
			
			let data = [];
			sequence.forEach(s => {
				let ContourGeometricType = s.ContourGeometricType; // e.g. "CLOSED_PLANAR"
				let ContourPoints        = s.NumberOfContourPoints;
				let ContourData          = s.ContourData;
				let obj = {
					points: formatPoints(ContourData),
					type: ContourGeometricType,
                    count: ContourPoints
				};
				data.push(obj);
			})
			
			let contour = {
				data: data,
				id: "contour_" + number,
				color: color,
				number: number,
                name: thisROISequence[thisROINumbers.indexOf(number)].ROIName,
				segmentIndex: number
			}
			
			contourSets.push(contour);
		})
        
        // console.log(' - [fetchAndLoadDCMSeg()] contourSets: ', contourSets)
        // Ste p5 - Create geometries
        let geometryIds = [];
        // let annotationUIDsMap = {}; // annotationUIDsMap?: Map<number, Set<string>>; annotation --> data.segmentation.segmentIndex, metadata.{viewPlaneNormal, viewUp, sliceIdx}, interpolationUID
        const promises = contourSets.map((contourSet) => {
		
            const geometryId = contourSet.id;
            geometryIds.push(geometryId);
            return cornerstone3D.geometryLoader.createAndCacheGeometry(geometryId, {
                type: cornerstone3D.Enums.GeometryType.CONTOUR,
                geometryData: contourSet, // [{data: [{points: [[x1,y1,z1], [x2,y2,z2], ...], type:<str> count: <int>}, {}, ...], id: <str>, color: [], number: <int>, name: <str>, segmentIndex: <int>}, {},  ...]
            });
        });
        await Promise.all(promises);
        totalROIsRTSTRUCT = thisROISequence.length;

        // Step 5 - Add new segmentation to cornerstone3D
        let segmentationId;
        if (maskType == MASK_TYPE_GT){
            segmentationId = [gtSegmentationIdBase, MODALITY_RTSTRUCT, cornerstone3D.utilities.uuidv4()].join('::');
        } else if (maskType == MASK_TYPE_PRED){
            segmentationId = [predSegmentationIdBase, MODALITY_RTSTRUCT, cornerstone3D.utilities.uuidv4()].join('::');
        }
        const {segReprUIDs} = await addSegmentationToState(segmentationId, cornerstone3DTools.Enums.SegmentationRepresentations.Contour, geometryIds);

        // Step 5 - Set variables and colors
        try{
            // console.log(' - [fetchAndLoadDCMSeg(',maskType,')]: segReprUIDs: ', segReprUIDs)
            if (maskType == MASK_TYPE_GT){
                global.gtSegmentationId   = segmentationId;
                global.gtSegmentationUIDs = segReprUIDs;
                // setSegmentationIndexColor(toolGroupIdContours, segReprUIDs[0], 1, COLOR_RGBA_ARRAY_GREEN);
            } else if (maskType == MASK_TYPE_PRED){
                global.predSegmentationId   = segmentationId;
                global.predSegmentationUIDs = segReprUIDs;
                // setSegmentationIndexColor(toolGroupIdContours, segReprUIDs[0], 1, COLOR_RGBA_ARRAY_RED);
            }
        } catch (error){
            console.log('   -- [fetchAndLoadDCMSeg()] Error: ', error);
        }

    }else if (dataset.Modality === 'SEG'){
        // Step 2 - Read dicom tags and generate a "toolState".
        // Important keys here are toolState.segmentsOnFrame (for debugging) and toolState.labelmapBufferArray
        const generateToolState = await cornerstoneAdapters.adaptersSEG.Cornerstone3D.Segmentation.generateToolState(
            imageIds,
            arrayBuffer,
            cornerstone3D.metaData
        );
        // console.log('\n - [fetchAndLoadDCMSeg()] generateToolState: ', generateToolState)

        // Step 3 - Add a new segmentation to cornerstone3D
        let segmentationId;
        if (maskType == MASK_TYPE_GT){
            segmentationId = [gtSegmentationIdBase, MODALITY_SEG, cornerstone3D.utilities.uuidv4()].join('::');
        } else if (maskType == MASK_TYPE_PRED){
            segmentationId = [predSegmentationIdBase, MODALITY_SEG, cornerstone3D.utilities.uuidv4()].join('::');
        } else if (maskType == MASK_TYPE_REFINE){
            segmentationId = [predSegmentationIdBase, MODALITY_SEG, cornerstone3D.utilities.uuidv4()].join('::');
        }
        const {derivedVolume, segReprUIDs} = await addSegmentationToState(segmentationId, cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap);
        
        // Step 4 - Add the dicom buffer to cornerstone3D segmentation 
        const derivedVolumeScalarData     = await derivedVolume.getScalarData();
        await derivedVolumeScalarData.set(new Uint8Array(generateToolState.labelmapBufferArray[0]));
        
        // Step 5 - Set variables and colors
        try{
            // console.log(' - [fetchAndLoadDCMSeg(',maskType,')]: segReprUIDs: ', segReprUIDs)
            if (maskType == MASK_TYPE_GT){
                global.gtSegmentationId   = segmentationId;
                global.gtSegmentationUIDs = segReprUIDs;
                setSegmentationIndexColor(toolGroupIdContours, segReprUIDs[0], 1, COLOR_RGBA_ARRAY_GREEN);
            } else if (maskType == MASK_TYPE_PRED){
                global.predSegmentationId   = segmentationId;
                global.predSegmentationUIDs = segReprUIDs;
                setSegmentationIndexColor(toolGroupIdContours, segReprUIDs[0], 1, COLOR_RGBA_ARRAY_RED);
            } else if (maskType == MASK_TYPE_REFINE){
                global.predSegmentationId   = segmentationId;
                global.predSegmentationUIDs = segReprUIDs;
                setSegmentationIndexColor(toolGroupIdContours, segReprUIDs[0], 1, COLOR_RGBA_ARRAY_PINK);
            }
        } catch (error){
            console.log('   -- [fetchAndLoadDCMSeg()] Error: ', error);
        }
        
    }

}

async function addSegmentationToState(segmentationIdParam, segType, geometryIds=[], verbose=false){
    // NOTE: segType = cornerstone3DTools.Enums.SegmentationRepresentations.{Labelmap, Contour}

    // Step 0 - Init
    let derivedVolume;
    if (verbose) console.log(' - [addSegmentationToState(',segmentationIdParam,')][before] allSegIdsAndUIDs: ', await cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations())

    // Step 1 - Create a segmentation volume
    if (segType === cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap)
        derivedVolume = await cornerstone3D.volumeLoader.createAndCacheDerivedSegmentationVolume(volumeIdCT, {volumeId: segmentationIdParam,});

    // Step 2 - Add the segmentation to the state
    if (segType === cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap)
        await cornerstone3DTools.segmentation.addSegmentations([{ segmentationId:segmentationIdParam, representation: { type: segType, data: { volumeId: segmentationIdParam, }, }, },]);
    else if (segType === cornerstone3DTools.Enums.SegmentationRepresentations.Contour)
        if (geometryIds.length === 0){
            await cornerstone3DTools.segmentation.addSegmentations([{ segmentationId:segmentationIdParam, representation: { type: segType, }, },]);
        } else {
            await cornerstone3DTools.segmentation.addSegmentations([
                { segmentationId:segmentationIdParam, representation: { type: segType, data:{geometryIds},}, },
            ]);
        }
    
    // Step 3 - Set the segmentation representation to the toolGroup
    const segReprUIDs = await cornerstone3DTools.segmentation.addSegmentationRepresentations(toolGroupIdContours, [
        // {segmentationId:segmentationIdParam, type: segType,}, //options: { polySeg: { enabled: true, }, },
        {segmentationId:segmentationIdParam, type: segType, }, // options: { polySeg: { enabled: true, }, },
    ]);

    // Step 4 - More stuff for Contour
    if (segType === cornerstone3DTools.Enums.SegmentationRepresentations.Contour){
        const segmentation = cornerstone3DTools.segmentation;
        segmentation.activeSegmentation.setActiveSegmentationRepresentation(toolGroupIdContours,segReprUIDs[0]);
        segmentation.segmentIndex.setActiveSegmentIndex(segmentationIdParam, 1);
    }
    
    if (verbose) console.log(' - [addSegmentationToState(',segmentationIdParam,')][after] allSegIdsAndUIDs: ', await cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations())
    return {derivedVolume, segReprUIDs}
}

// (Sub) MAIN FUNCTION
async function restart() {
    
    try{
        printHeaderInConsole('Step 0 - restart()');

        // Step 1 - Block GUI
        [windowLevelButton, contourSegmentationToolButton, sculptorToolButton, editBaseContourViaScribbleButton, showPETButton].forEach((buttonHTML) => {
            if (buttonHTML === null) return;
            setButtonBoundaryColor(buttonHTML, false);
            buttonHTML.disabled = true;
        });

        // Other GUI
        setServerStatus(0);
        
        // Step 2 - Remove all segmentationIds
        try{

            const allSegObjs     = cornerstone3DTools.segmentation.state.getSegmentations();
            const allSegRepsObjs = cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations()[toolGroupIdContours];
            allSegObjs.forEach(segObj => {
                const thisSegRepsObj = allSegRepsObjs.filter(obj => obj.segmentationId === segObj.segmentationId)[0]
                cornerstone3DTools.segmentation.removeSegmentationsFromToolGroup(toolGroupIdContours, [thisSegRepsObj.segmentationRepresentationUID,], false);
                cornerstone3DTools.segmentation.state.removeSegmentation(segObj.segmentationId);
                if (segObj.type == SEG_TYPE_LABELMAP)
                    cornerstone3D.cache.removeVolumeLoadObject(segObj.segmentationId);
            });
            console.log(' - [restart()] new allSegObjs      : ', cornerstone3DTools.segmentation.state.getSegmentations());
            console.log(' - [restart()] new allSegIdsAndUIDs: ', cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations());

        } catch (error){
            console.error(' - [restart()] Error in removing segmentations: ', error);
            showToast('Error in removing segmentations', 3000);
        }

        // Step 3 - Clear cache (images and volumes)
        // await cornerstone3D.cache.purgeCache(); // does cache.removeVolumeLoadObject() and cache.removeImageLoadObject() inside // cornerstone3D.cache.getVolumes(), cornerstone3D.cache.getCacheSize()
        if (volumeIdCT != undefined) cornerstone3D.cache.removeVolumeLoadObject(volumeIdCT);
        if (volumeIdPET != undefined) cornerstone3D.cache.removeVolumeLoadObject(volumeIdPET);

    } catch (error){
        console.error(' - [restart()] Error: ', error);
        showToast('Error in restart()', 3000);
    }
    
    // Step 4 - Reset global variables
    fusedPETCT   = false;
    petBool      = false;
    global.gtSegmentationId          = undefined;
    global.gtSegmentationUIDs        = undefined;
    global.predSegmentationId        = undefined;
    global.predSegmentationUIDs      = undefined;
    global.scribbleSegmentationUIDs = undefined;
    volumeIdCT  = undefined;
    volumeIdPET = undefined;
    totalImagesIdsCT  = undefined;
    totalImagesIdsPET = undefined;
    totalROIsRTSTRUCT = undefined;


    // Step 5 - Other stuff
    // setToolsAsActivePassive(true);
    // const stackScrollMouseWheelTool = cornerstone3DTools.StackScrollMouseWheelTool;
    // const toolGroup = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupId);
    // toolGroup.setToolPassive(stackScrollMouseWheelTool.toolName);

}

// MAIN FUNCTION
async function fetchAndLoadData(patientIdx){

    await showLoaderAnimation();
    await restart();
    printHeaderInConsole('Step 1 - Getting .dcm data')
    
    //////////////////////////////////////////////////////////// Step 1 - Get search parameters
    if (orthanDataURLS.length >= patientIdx+1){
        
        const {caseName, reverseImageIds, searchObjCT, searchObjPET, searchObjRTSGT, searchObjRTSPred} = orthanDataURLS[patientIdx];
        
        ////////////////////////////////////////////////////////////// Step 2.1 - Create volume for CT
        if (searchObjCT.wadoRsRoot.length > 0){

            // Step 2.1.0 - Init for CT load
            const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);

            // Step 2.1.1 - Load CT data (in python server)
            makeRequestToPrepare(patientIdx)

            // Step 2.1.2 - Fetch CT data
            volumeIdCT     = [volumeIdCTBase, cornerstone3D.utilities.uuidv4()].join(':');
            global.ctFetchBool = false;
            try{
                global.imageIdsCT = await createImageIdsAndCacheMetaData(searchObjCT);
                global.imageIdsCT = sortImageIds(global.imageIdsCT);
                global.ctFetchBool = true;
            } catch (error){
                console.error(' - [loadData()] Error in createImageIdsAndCacheMetaData(searchObjCT): ', error);
                showToast('Error in loading CT data', 3000);
            }
            
            // Step 2.1.3 - Load CT data
            if (global.ctFetchBool){
                try{
                    if (reverseImageIds){
                        global.imageIdsCT = global.imageIdsCT.reverse();
                        console.log(' - [loadData()] Reversed imageIdsCT');
                    }
                    totalImagesIdsCT = global.imageIdsCT.length;
                    const volumeCT   = await cornerstone3D.volumeLoader.createAndCacheVolume(volumeIdCT, { imageIds:global.imageIdsCT});
                    await volumeCT.load();
                } catch (error){
                    console.error(' - [loadData()] Error in createAndCacheVolume(volumeIdCT, { imageIds:imageIdsCT }): ', error);
                    showToast('Error in creating volume for CT data', 3000);
                }

                ////////////////////////////////////////////////////////////// Step 2.2 - Create volume for PET
                if (searchObjPET.wadoRsRoot.length > 0){
                    
                    // Step 2.2.1 - Fetch PET data
                    volumeIdPET      = [volumeIdPETBase, cornerstone3D.utilities.uuidv4()].join(':');
                    let petFetchBool  = false;
                    let imageIdsPET  = [];
                    try{
                        imageIdsPET = await createImageIdsAndCacheMetaData(searchObjPET);
                        petFetchBool = true;
                    } catch(error){
                        console.error(' - [loadData()] Error in createImageIdsAndCacheMetaData(searchObjPET): ', error);
                        showToast('Error in loading PET data', 3000);
                    }

                    // Step 2.2.2 - Load PET data
                    if (petFetchBool){

                        try{
                            if (reverseImageIds){
                                imageIdsPET = imageIdsPET.reverse();
                            }
                            totalImagesIdsPET = imageIdsPET.length;
                            if (totalImagesIdsPET != totalImagesIdsCT)
                                showToast(`CT (${totalImagesIdsCT}) and PET (${totalImagesIdsPET}) have different number of imageIds`, 5000);
                            const volumePT    = await cornerstone3D.volumeLoader.createAndCacheVolume(volumeIdPET, { imageIds: imageIdsPET });
                            volumePT.load();
                            petBool = true;
                        } catch (error){
                            console.error(' - [loadData()] Error in createAndCacheVolume(volumeIdPET, { imageIds:imageIdsPET }): ', error);
                            showToast('Error in creating volume for PET data', 3000);
                        }
                    }
                }

                ////////////////////////////////////////////////////////////// Step 3 - Set volumes for viewports
                await cornerstone3D.setVolumesForViewports(renderingEngine, [{ volumeId:volumeIdCT}, ], viewportIds, true);
                
                ////////////////////////////////////////////////////////////// Step 4 - Render viewports
                await renderingEngine.renderViewports(viewportIds);

                ////////////////////////////////////////////////////////////// Step 5 - setup segmentation
                printHeaderInConsole(`Step 3 - Segmentation stuff (${caseName} - CT slices:${totalImagesIdsCT})`)
                console.log(' - orthanDataURLS[caseNumber]: ', orthanDataURLS[patientIdx])
                if (searchObjRTSGT.wadoRsRoot.length > 0){
                    try{
                        await fetchAndLoadDCMSeg(searchObjRTSGT, global.imageIdsCT, MASK_TYPE_GT)
                    } catch (error){
                        console.error(' - [loadData()] Error in fetchAndLoadDCMSeg(searchObjRTSGT, imageIdsCT): ', error);
                        showToast('Error in loading GT segmentation data', 3000);
                    }
                }
                if (searchObjRTSPred.wadoRsRoot.length > 0){
                    try{
                        await fetchAndLoadDCMSeg(searchObjRTSPred, global.imageIdsCT, MASK_TYPE_PRED)
                    } catch (error){
                        console.error(' - [loadData()] Error in fetchAndLoadDCMSeg(searchObjRTSPred, imageIdsCT): ', error);
                        showToast('Error in loading predicted segmentation data', 3000);
                    }
                }
                try{
                    scribbleSegmentationId = scribbleSegmentationIdBase + '::' + cornerstone3D.utilities.uuidv4();
                    let { segReprUIDs} = await addSegmentationToState(scribbleSegmentationId, cornerstone3DTools.Enums.SegmentationRepresentations.Contour);
                    global.scribbleSegmentationUIDs = segReprUIDs;
                } catch (error){
                    console.error(' - [loadData()] Error in addSegmentationToState(scribbleSegmentationId, cornerstone3DTools.Enums.SegmentationRepresentations.Contour): ', error);
                }

                ////////////////////////////////////////////////////////////// Step 6 - Set tools as active/passive
                // const stackScrollMouseWheelTool = cornerstone3DTools.StackScrollMouseWheelTool;
                // const toolGroup = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupId);
                // toolGroup.setToolActive(stackScrollMouseWheelTool.toolName);
                
                ////////////////////////////////////////////////////////////// Step 99 - Done
                caseSelectionHTML.selectedIndex = patientIdx;
                unshowLoaderAnimation();
                showSliceIds();
                showToast(`Data loaded successfully (CT=${totalImagesIdsCT} slices, ROIs=${totalROIsRTSTRUCT})`, 3000, true);
                [windowLevelButton, contourSegmentationToolButton, sculptorToolButton, editBaseContourViaScribbleButton, showPETButton].forEach((buttonHTML) => {
                    if (buttonHTML === null) return;
                    buttonHTML.disabled = false;
                });

            }

        }else{
            showToast('No CT data available')
            await unshowLoaderAnimation()
        }
    }else{
        showToast('Default case not available. Select another case.')
        await unshowLoaderAnimation()
    }

    await unshowLoaderAnimation()
}

/****************************************************************
*                             MAIN  
*****************************************************************/
async function setup(patientIdx){

    // Step 0 - Load orthanc data
    await getDataURLs();
    await setupDropDownMenu(orthanDataURLS, patientIdx);
    await showLoaderAnimation()
    await unshowLoaderAnimation()
    
    // -------------------------------------------------> Step 1 - Init
    await cornerstoneInit();
    
    // // -------------------------------------------------> Step 2 - Do tooling stuff
    await getToolsAndToolGroup();    

    // // -------------------------------------------------> Step 3 - Make rendering engine
    setRenderingEngineAndViewports();
    
    // // -------------------------------------------------> Step 4 - Get .dcm data
    await fetchAndLoadData(patientIdx);
    setContouringButtonsLogic();
    setMouseAndKeyboardEvents();

}

// Some debug params
global.patientIdx = 13;
MODALITY_CONTOURS = MODALITY_SEG

if (process.env.NETLIFY === "true")
    global.patientIdx = 0;
setup(global.patientIdx)



/**
TO-DO
1. [P] Make trsnsfer function for PET
2. [P] ORTHANC__DICOM_WEB__METADATA_WORKER_THREADS_COUNT = 1
3. [P] https://www.cornerstonejs.org/docs/examples/#polymorph-segmentation
    - https://github.com/cornerstonejs/cornerstone3D/issues/1351
4. Sometimes mouseUp event does not capture events
 */