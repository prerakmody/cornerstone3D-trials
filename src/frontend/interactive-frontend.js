import dicomParser from 'dicom-parser';

import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstoneAdapters from "@cornerstonejs/adapters"; // dont remove this, gives cirucular dependency error: ReferenceError: Cannot access '__WEBPACK_DEFAULT_EXPORT__' before initialization
import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import * as cornerstoneStreamingImageLoader from '@cornerstonejs/streaming-image-volume-loader';

import * as cornerstone3DTools from '@cornerstonejs/tools';

import createImageIdsAndCacheMetaData from './helpers/createImageIdsAndCacheMetaData'; // https://github.com/cornerstonejs/cornerstone3D/blob/a4ca4dde651d17e658a4aec5a4e3ec1b274dc580/utils/demo/helpers/createImageIdsAndCacheMetaData.js
// // import setPetColorMapTransferFunctionForVolumeActor from './helpers/setPetColorMapTransferFunctionForVolumeActor'; //https://github.com/cornerstonejs/cornerstone3D/blob/v1.77.13/utils/demo/helpers/setPetColorMapTransferFunctionForVolumeActor.js
// // import setCtTransferFunctionForVolumeActor from './helpers/setCtTransferFunctionForVolumeActor'; // https://github.com/cornerstonejs/cornerstone3D/blob/v1.77.13/utils/demo/helpers/setCtTransferFunctionForVolumeActor.js

import * as config from './helpers/config'
import * as makeGUIElementsHelper from './helpers/makeGUIElementsHelper'
import * as updateGUIElementsHelper from './helpers/updateGUIElementsHelper'
import * as keyboardEventsHelper from './helpers/keyboardEventsHelper'
import * as cornerstoneHelpers from './helpers/cornerstoneHelpers'
import * as apiEndpointHelpers from './helpers/apiEndpointHelpers'
import * as segmentationHelpers from './helpers/segmentationHelpers'

import { vec3 } from 'gl-matrix';
import Highcharts from 'highcharts';
import Histogram from 'highcharts/modules/histogram-bellcurve';
Histogram(Highcharts)



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
// let volumeIdCT;
// let volumeIdPET;

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

let scribbleSegmentationId;

const SEG_TYPE_LABELMAP = 'LABELMAP'

// Python server
// const PYTHON_SERVER_CERT        = fs.readFileSync('../backend/hostCert.pem')
// const PYTHON_SERVER_HTTPSAGENT = new https.Agent({ ca: PYTHON_SERVER_CERT })
const URL_PYTHON_SERVER = `${window.location.origin}`.replace('50000', '55000') //[`${window.location.origin}`, 'https://localhost:55000']
const ENDPOINT_PREPARE  = '/prepare'
const KEY_DATA          = 'data'
const KEY_IDENTIFIER    = 'identifier'
const METHOD_POST       = 'POST'
const HEADERS_JSON      = {'Content-Type': 'application/json',}


// Tools
const MODE_ACTIVE  = 'Active';

// General
let ctFetchBool  = false;
let fusedPETCT   = false;
let petBool      = false;
let totalImagesIdsCT = undefined;
let totalImagesIdsPET = undefined;
let totalROIsRTSTRUCT = undefined;

/****************************************************************
*                         HTML ELEMENTS  
*****************************************************************/

await makeGUIElementsHelper.createViewPortsHTML();
let axialDiv=config.axialDiv, sagittalDiv=config.sagittalDiv, coronalDiv=config.coronalDiv;
let axialDivPT=config.axialDivPT, sagittalDivPT=config.sagittalDivPT, coronalDivPT=config.coronalDivPT;
let serverStatusCircle=config.serverStatusCircle, serverStatusTextDiv=config.serverStatusTextDiv;
// let axialDiv=config.getAxialDiv(), sagittalDiv=config.getSagittalDiv(), coronalDiv=config.getCoronalDiv();
// let axialDivPT=config.getAxialDivPT(), sagittalDivPT=config.getSagittalDivPT(), coronalDivPT=config.getCoronalDivPT();
// let serverStatusCircle=config.getServerStatusCircle(), serverStatusTextDiv=config.getServerStatusTextDiv();
// let axialSliceDiv=config.getAxialSliceDiv(), sagittalSliceDiv=config.getSagittalSliceDiv(), coronalSliceDiv=config.getCoronalSliceDiv();
// let axialSliceDivPT=config.getAxialSliceDivPT(), sagittalSliceDivPT=config.getSagittalSliceDivPT(), coronalSliceDivPT=config.getCoronalSliceDivPT();

// const {axialDiv, sagittalDiv, coronalDiv, axialSliceDiv, sagittalSliceDiv, coronalSliceDiv
//     , serverStatusCircle, serverStatusTextDiv
//     , viewportPTGridDiv, axialDivPT, sagittalDivPT, coronalDivPT, axialSliceDivPT, sagittalSliceDivPT, coronalSliceDivPT
// } = await guiELements.createViewPortsHTML();

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

    ///////////////////////////////////////////////////////////////////////////////////// Step 2.0 - Reset view button
    const resetViewButton = document.createElement('button');
    resetViewButton.id = 'resetViewButton';
    resetViewButton.innerHTML = 'Reset View';
    resetViewButton.addEventListener('click', function() {
        resetView();
    });

    ///////////////////////////////////////////////////////////////////////////////////// Step 3.1 - Show PET button
    const showPETButton     = document.createElement('button');
    showPETButton.id        = 'showPETButton';
    showPETButton.innerHTML = 'Show PET';
    showPETButton.addEventListener('click', async function() {
        showPET(this);
    });

    ///////////////////////////////////////////////////////////////////////////////////// hover functionality
    const histContainer = document.createElement('div');
    histContainer.id = 'histContainer';
    histContainer.style.display = 'none';
    histContainer.style.position = 'absolute';
    histContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    histContainer.width = '200px';
    histContainer.height = '200px';
    histContainer.zIndex = '15002'; // Ensure zIndex is a string

    // Sample data for the histogram
    const dataList = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const data = [ 3.5, 3, 3.2, 3.1, 3.6, 3.9, 3.4, 3.4, 2.9, 3.1, 3.7, 3.4, 3, 3, 4, 4.4, 3.9, 3.5, 3.8, 3.8, 3.4, 3.7, 3.6, 3.3, 3.4, 3, 3.4, 3.5, 3.4, 3.2, 3.1, 3.4, 4.1, 4.2, 3.1, 3.2, 3.5, 3.6, 3, 3.4, 3.5, 2.3, 3.2, 3.5, 3.8, 3, 3.8, 3.2, 3.7, 3.3, 3.2, 3.2, 3.1, 2.3, 2.8, 2.8, 3.3, 2.4, 2.9, 2.7, 2, 3, 2.2, 2.9, 2.9, 3.1, 3, 2.7, 2.2, 2.5, 3.2, 2.8, 2.5, 2.8, 2.9, 3, 2.8, 3, 2.9, 2.6, 2.4, 2.4, 2.7, 2.7, 3, 3.4, 3.1, 2.3, 3, 2.5, 2.6, 3, 2.6, 2.3, 2.7, 3, 2.9, 2.9, 2.5, 2.8, 3.3, 2.7, 3, 2.9, 3, 3, 2.5, 2.9, 2.5, 3.6, 3.2, 2.7, 3, 2.5, 2.8, 3.2, 3, 3.8, 2.6, 2.2, 3.2, 2.8, 2.8, 2.7, 3.3, 3.2, 2.8, 3, 2.8, 3, 2.8, 3.8, 2.8, 2.8, 2.6, 3, 3.4, 3.1, 3, 3.1, 3.1, 3.1, 2.7, 3.2, 3.3, 3, 2.5, 3, 3.4, 3 ];

    // Create the histogram using Chart.js
    // https://www.highcharts.com/docs/chart-and-series-types/histogram-series
    document.addEventListener('DOMContentLoaded', () => {
        // console.log('DOMContentLoaded!!!!!!!!!!!!!!!!!');
        
        Highcharts.chart('histContainer', {
            // chart: {
            //   type: 'bar'
            // },
            // title: {
            //   text: 'Fruit Consumption'
            // },
            // xAxis: {
            //   categories: ['Apples', 'Bananas', 'Oranges']
            // },
            // yAxis: {
            //   title: {
            //     text: 'Fruit eaten'
            //   }
            // },
            // series: [{
            //   name: 'Jane',
            //   data: [1, 0, 4]
            // }, {
            //   name: 'John',
            //   data: [5, 7, 3]
            // }]

            // chart: {
            //     type: 'column'
            //   },
            //   title: {
            //     text: 'Histogram of Sample Data'
            //   },
            //   xAxis: {
            //     title: {
            //       text: 'Data Value'
            //     }
            //   },
            //   yAxis: {
            //     title: {
            //       text: 'Frequency'
            //     }
            //   },
            //   series: [{
            //     name: 'Frequency',
            //     data: dataList.reduce((acc, val) => {
            //       acc[val] = (acc[val] || 0) + 1;
            //       return acc;
            //     }, []).map((freq, val) => [val, freq])
            //   }]

            // title: {
            //     text: '[WIP] PET SUV Values'
            // },
        
            // xAxis: [{
            //     title: { text: 'Data' },
            //     alignTicks: false
            // }, {
            //     title: { text: 'Histogram' },
            //     alignTicks: false,
            //     opposite: true
            // }],
        
            // yAxis: [{
            //     title: { text: 'Data' }
            // }, {
            //     title: { text: 'Histogram' },
            //     opposite: true
            // }],
        
            // plotOptions: {
            //     histogram: {
            //         accessibility: {
            //             point: {
            //                 valueDescriptionFormat: '{index}. {point.x:.3f} to ' +
            //                     '{point.x2:.3f}, {point.y}.'
            //             }
            //         }
            //     }
            // },
        
            // series: [{
            //     name: 'Histogram',
            //     type: 'histogram',
            //     xAxis: 1,
            //     yAxis: 1,
            //     baseSeries: 's1',
            //     zIndex: -1
            // }, {
            //     name: 'Data',
            //     type: 'scatter',
            //     data: data,
            //     id: 's1',
            //     marker: {
            //         radius: 0
            //     }
            // }]

            // chart: {
            //     type: 'column'
            //   },
            //   title: {
            //     text: 'Histogram of Sample Data'
            //   },
            //   xAxis: {
            //     title: {
            //       text: 'Data Value'
            //     }
            //   },
            //   yAxis: {
            //     title: {
            //       text: 'Frequency'
            //     }
            //   },
            //   series: [{
            //     name: 'Frequency',
            //     data: data.reduce((acc, val) => {
            //       acc[val] = (acc[val] || 0) + 1;
            //       return acc;
            //     }, []).map((freq, val) => [val, freq])
            //   }]

        });

        histContainer.style.display = 'none'
    });

    showPETButton.addEventListener('mouseover', (event) => {
        // console.log('showing histogram');
        // histContainer.style.display = 'block';
        // histContainer.style.left = `${event.pageX + 10}px`;
        // histContainer.style.top = `${event.pageY + 10}px`;
        // histContainer.style.zIndex = '15002'; // Ensure zIndex is a string
    });

    showPETButton.addEventListener('mouseout', () => {
        // console.log('hiding histogram');    
        // histContainer.style.display = 'none';
    });

    ///////////////////////////////////////////////////////////////////////////////////// Step 4.0 - Show hoverelements
    // const mouseHoverDiv = document.createElement('div');
    // mouseHoverDiv.id = 'mouseHoverDiv';
    // const mouseHoverDiv = document.createElement('div');
    // mouseHoverDiv.style.position = 'absolute'; // Change to absolute
    // mouseHoverDiv.style.bottom = '3';
    // mouseHoverDiv.style.left = '3';
    // mouseHoverDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    // mouseHoverDiv.style.color = 'white';
    // mouseHoverDiv.style.padding = '5px';
    // mouseHoverDiv.style.zIndex = '1000'; // Ensure zIndex is a string
    // mouseHoverDiv.id = 'mouseHoverDiv';
    // mouseHoverDiv.style.fontSize = '10px';
    // axialDiv.appendChild(mouseHoverDiv);

    // const canvasPosHTML = document.createElement('p');
    // const ctValueHTML = document.createElement('p');
    // const ptValueHTML = document.createElement('p');
    // canvasPosHTML.innerText = 'Canvas position:';
    // ctValueHTML.innerText = 'CT value:';
    // ptValueHTML.innerText = 'PT value:';

    // viewportIds.forEach((viewportId_, index) => {
    //     const viewportDiv = document.getElementById(viewportIds[index]);
    //     viewportDiv.addEventListener('mousemove', function(evt) {
    //         if (volumeIdCT != undefined){
    //             const volumeCTThis = cornerstone3D.cache.getVolume(volumeIdCT);
    //             if (volumeCTThis != undefined){
    //                 const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
    //                 const rect        = viewportDiv.getBoundingClientRect();
    //                 const canvasPos   = [Math.floor(evt.clientX - rect.left),Math.floor(evt.clientY - rect.top),];
    //                 const viewPortTmp = renderingEngine.getViewport(viewportIds[index]);
    //                 const worldPos    = viewPortTmp.canvasToWorld(canvasPos);
    //                 let index3D       = getIndex(volumeCTThis, worldPos) //.forEach((val) => Math.round(val));
    //                 if (canvasPos != undefined && index3D != undefined && worldPos != undefined){
    //                     index3D       = index3D.map((val) => Math.round(val));
    //                     canvasPosHTML.innerText = `Canvas position: (${viewportIds[index]}) \n ==> (${canvasPos[0]}, ${canvasPos[1]}) || (${index3D[0]}, ${index3D[1]}, ${index3D[2]})`;
    //                     ctValueHTML.innerText = `CT value: ${getValue(volumeCTThis, worldPos)}`;
    //                     if (volumeIdPET != undefined){
    //                         const volumePTThis = cornerstone3D.cache.getVolume(volumeIdPET);
    //                         ptValueHTML.innerText = `PT value: ${getValue(volumePTThis, worldPos)}`;
    //                     }
    //                 }else{
    //                     updateGUIElementsHelper.showToast('Mousemove Event: Error in getting canvasPos, index3D, worldPos')
    //                 }                    
                    
    //             }
    //         }
    //     });
    // });

    // mouseHoverDiv.appendChild(canvasPosHTML);
    // mouseHoverDiv.appendChild(ctValueHTML);
    // mouseHoverDiv.appendChild(ptValueHTML);

    ///////////////////////////////////////////////////////////////////////////////////// Step 5 - Create dropdown for case selection
    const caseSelectionHTML     = document.createElement('select');
    caseSelectionHTML.id        = 'caseSelection';
    caseSelectionHTML.innerHTML = 'Case Selection';
    caseSelectionHTML.addEventListener('change', async function() {
        global.patientIdx = parseInt(this.value);
        await fetchAndLoadData(global.patientIdx);
    });

    ///////////////////////////////////////////////////////////////////////////////////// Step 99 - Add to contentDiv
    otherButtonsDiv.appendChild(caseSelectionHTML);
    otherButtonsDiv.appendChild(resetViewButton);
    otherButtonsDiv.appendChild(showPETButton);
    otherButtonsDiv.appendChild(histContainer);
    // otherButtonsDiv.appendChild(mouseHoverDiv);
    interactionButtonsDiv.appendChild(otherButtonsDiv);

    return {caseSelectionHTML, resetViewButton, showPETButton};
}
const {caseSelectionHTML, showPETButton} = await otherHTMLElements(0);


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

let orthancHeaders = new Headers();
orthancHeaders.set('Authorization', 'Basic ' + btoa('orthanc'+ ":" + 'orthanc'));

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

function setScribbleColor() {
    const fgdCheckbox = document.getElementById('fgdCheckbox');
    const bgdCheckbox = document.getElementById('bgdCheckbox');
    if (fgdCheckbox.checked) setAnnotationColor(COLOR_RGB_FGD);
    if (bgdCheckbox.checked) setAnnotationColor(COLOR_RGB_BGD);
}

async function showPET(thisButton){
    // NOTE: petBool=if pet data is available and loaded, fusedPETCT=if true, then PET shown, otherwise not

    // Step 0 - Init
    if (thisButton === undefined)
        thisButton = document.getElementById('showPETButton');

    if (petBool){
        const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
        if (fusedPETCT) {
            viewportIds.forEach((viewportId) => {
                const viewportTmp = renderingEngine.getViewport(viewportId);
                // viewportTmp.removeVolumeActors([volumeIdPET], true);
                viewportTmp.removeVolumeActors([volumeIdPET], false);
                fusedPETCT = false;
            });
            setButtonBoundaryColor(thisButton, false);
        }
        else {
            // [axialID, sagittalID, coronalID].forEach((viewportId) => {
            for (const viewportId of viewportIds) {
                const viewportTmp = renderingEngine.getViewport(viewportId);
                // await viewportTmp.addVolumes([{ volumeId: volumeIdPET,}], true); // immediate=true
                await viewportTmp.addVolumes([{ volumeId: volumeIdPET,}], false); // immediate=false had not effect for the jarring-effect from showPET() followed by setSliceIdxForViewPortFromGlobalSliceIdxVars() 
                fusedPETCT = true;
                viewportTmp.setProperties({ colormap: { name: 'hsv', opacity:0.5 }, voiRange: { upper: 50000, lower: 100, } }, volumeIdPET);
                // viewportTmp.setProperties({ colormap: { name: 'PET 20 Step', opacity:0.5 }, voiRange: { upper: 50000, lower: 100, } }, volumeIdPET);
                // console.log(' -- colormap: ', viewportTmp.getColormap(volumeIdPET), viewportTmp.getColormap(volumeIdCT)); 
            };
            setButtonBoundaryColor(thisButton, true);
        }
    }else{
        updateGUIElementsHelper.showToast('No PET data available')
    }
}

async function makeRequestToPrepare(patientIdx){

    let requestStatus = false;
    try{
        
        // Step 1 - Init
        const preparePayload = {[KEY_DATA]: config.orthanDataURLS[patientIdx],[KEY_IDENTIFIER]: config.instanceName,}
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
        setServerStatus(1, 'Error in /prepare: ' + error);
        console.log('   -- [makeRequestToPrepare()] Error: ', error);
        updateGUIElementsHelper.showToast('Python server - /prepare failed', 3000)
    }

    return requestStatus;
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

// ******************************* CORNERSTONE FUNCS *********************************

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
    [axialDiv, sagittalDiv, coronalDiv, axialDivPT, sagittalDivPT, coronalDivPT].forEach((viewportDiv, index) => {
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
    window.addEventListener('keydown', async function(event) {
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

        else if (event.key == 'p'){
            await showPET();
            await setSliceIdxForViewPortFromGlobalSliceIdxVars(false);
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

}

async function setRenderingEngineAndViewports(){

    const renderingEngine = new cornerstone3D.RenderingEngine(renderingEngineId);

    // Step 2.5.1 - Add image planes to rendering engine
    const viewportInputs = [
        {element: axialDiv     , viewportId: axialID            , type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.AXIAL},},
        {element: sagittalDiv  , viewportId: sagittalID         , type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.SAGITTAL},},
        {element: coronalDiv   , viewportId: coronalID          , type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.CORONAL},},
        {element: axialDivPT   , viewportId: config.axialPTID   , type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.AXIAL},},
        {element: sagittalDivPT, viewportId: config.sagittalPTID, type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.SAGITTAL},},
        {element: coronalDivPT , viewportId: config.coronalPTID , type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.CORONAL},},
    ]
    renderingEngine.setViewports(viewportInputs);
    
    // Step 2.5.2 - Add toolGroupIdContours to rendering engine
    const toolGroup = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupIdContours);
    config.viewPortIdsAll.forEach((viewportId) =>
        toolGroup.addViewport(viewportId, renderingEngineId)
    );

    // return {renderingEngine};
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
            updateGUIElementsHelper.showToast('Error in removing segmentations', 3000);
        }

        // Step 3 - Clear cache (images and volumes)
        // await cornerstone3D.cache.purgeCache(); // does cache.removeVolumeLoadObject() and cache.removeImageLoadObject() inside // cornerstone3D.cache.getVolumes(), cornerstone3D.cache.getCacheSize()
        if (config.volumeIdCT != undefined) cornerstone3D.cache.removeVolumeLoadObject(config.volumeIdCT);
        if (config.volumeIdPET != undefined) cornerstone3D.cache.removeVolumeLoadObject(config.volumeIdPET);

    } catch (error){
        console.error(' - [restart()] Error: ', error);
        updateGUIElementsHelper.showToast('Error in restart()', 3000);
    }
    
    // Step 4 - Reset global variables
    fusedPETCT   = false;
    petBool      = false;
    global.gtSegmentationId          = undefined;
    global.gtSegmentationUIDs        = undefined;
    global.predSegmentationId        = undefined;
    global.predSegmentationUIDs      = undefined;
    global.scribbleSegmentationUIDs = undefined;
    // config.volumeIdCT  = undefined;
    // config.volumeIdPET = undefined;
    config.setVolumeIdCT(undefined);
    config.setVolumeIdPET(undefined);
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

    await updateGUIElementsHelper.showLoaderAnimation();
    await restart();
    printHeaderInConsole('Step 1 - Getting .dcm data')
    
    //////////////////////////////////////////////////////////// Step 1 - Get search parameters
    if (config.orthanDataURLS.length >= patientIdx+1){
        
        const {caseName, reverseImageIds, searchObjCT, searchObjPET, searchObjRTSGT, searchObjRTSPred} = config.orthanDataURLS[patientIdx];
        
        ////////////////////////////////////////////////////////////// Step 2.1 - Create volume for CT
        if (searchObjCT.wadoRsRoot.length > 0){

            // Step 2.1.0 - Init for CT load
            const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);

            // Step 2.1.1 - Load CT data (in python server)
            makeRequestToPrepare(patientIdx)

            // Step 2.1.2 - Fetch CT data
            config.setVolumeIdCT([volumeIdCTBase, cornerstone3D.utilities.uuidv4()].join(':'));
            global.ctFetchBool = false;
            try{
                let imageIdsCTTmp = await createImageIdsAndCacheMetaData(searchObjCT);
                imageIdsCTTmp = sortImageIds(imageIdsCTTmp);
                config.setImageIdsCT(imageIdsCTTmp);
                global.ctFetchBool = true;
            } catch (error){
                console.error(' - [loadData()] Error in createImageIdsAndCacheMetaData(searchObjCT): ', error);
                updateGUIElementsHelper.showToast('Error in loading CT data', 3000);
            }
            
            // Step 2.1.3 - Load CT data
            if (global.ctFetchBool){
                try{
                    if (reverseImageIds){
                        config.setImageIdsCT(config.imageIdsCT.reverse());
                        console.log(' - [loadData()] Reversed imageIdsCT');
                    }
                    totalImagesIdsCT = config.imageIdsCT.length;
                    const volumeCT   = await cornerstone3D.volumeLoader.createAndCacheVolume(config.volumeIdCT, { imageIds:config.imageIdsCT});
                    await volumeCT.load();
                } catch (error){
                    console.error(' - [loadData()] Error in createAndCacheVolume(volumeIdCT, { imageIds:imageIdsCT }): ', error);
                    updateGUIElementsHelper.showToast('Error in creating volume for CT data', 3000);
                }

                ////////////////////////////////////////////////////////////// Step 2.2 - Create volume for PET
                if (searchObjPET.wadoRsRoot.length > 0){
                    
                    // Step 2.2.1 - Fetch PET data
                    config.setVolumeIdPET([volumeIdPETBase, cornerstone3D.utilities.uuidv4()].join(':'));
                    let petFetchBool  = false;
                    let imageIdsPET  = [];
                    try{
                        imageIdsPET = await createImageIdsAndCacheMetaData(searchObjPET);
                        petFetchBool = true;
                    } catch(error){
                        console.error(' - [loadData()] Error in createImageIdsAndCacheMetaData(searchObjPET): ', error);
                        updateGUIElementsHelper.showToast('Error in loading PET data', 3000);
                    }

                    // Step 2.2.2 - Load PET data
                    if (petFetchBool){

                        try{
                            if (reverseImageIds){
                                imageIdsPET = imageIdsPET.reverse();
                            }
                            totalImagesIdsPET = imageIdsPET.length;
                            if (totalImagesIdsPET != totalImagesIdsCT)
                                updateGUIElementsHelper.showToast(`CT (${totalImagesIdsCT}) and PET (${totalImagesIdsPET}) have different number of imageIds`, 5000);
                            const volumePT    = await cornerstone3D.volumeLoader.createAndCacheVolume(config.volumeIdPET, { imageIds: imageIdsPET });
                            volumePT.load();
                            petBool = true;
                        } catch (error){
                            console.error(' - [loadData()] Error in createAndCacheVolume(volumeIdPET, { imageIds:imageIdsPET }): ', error);
                            updateGUIElementsHelper.showToast('Error in creating volume for PET data', 3000);
                        }
                    }
                }

                ////////////////////////////////////////////////////////////// Step 3 - Set volumes for viewports
                await cornerstone3D.setVolumesForViewports(renderingEngine, [{ volumeId:config.volumeIdCT}, ], viewportIds, true);
                await cornerstone3D.setVolumesForViewports(renderingEngine, [{ volumeId:config.volumeIdPET}, ], config.viewPortPTIds, true);
                
                ////////////////////////////////////////////////////////////// Step 4 - Render viewports
                await renderingEngine.renderViewports(viewportIds);
                await renderingEngine.renderViewports(config.viewPortPTIds);

                ////////////////////////////////////////////////////////////// Step 5 - setup segmentation
                printHeaderInConsole(`Step 3 - Segmentation stuff (${caseName} - CT slices:${totalImagesIdsCT})`)
                console.log(' - orthanDataURLS[caseNumber]: ', config.orthanDataURLS[patientIdx])
                if (searchObjRTSGT.wadoRsRoot.length > 0){
                    try{
                        await segmentationHelpers.fetchAndLoadDCMSeg(searchObjRTSGT, config.imageIdsCT, MASK_TYPE_GT)
                    } catch (error){
                        console.error(' - [loadData()] Error in fetchAndLoadDCMSeg(searchObjRTSGT, imageIdsCT): ', error);
                        updateGUIElementsHelper.showToast('Error in loading GT segmentation data', 3000);
                    }
                }
                if (searchObjRTSPred.wadoRsRoot.length > 0){
                    try{
                        await segmentationHelpers.fetchAndLoadDCMSeg(searchObjRTSPred, config.imageIdsCT, MASK_TYPE_PRED)
                    } catch (error){
                        console.error(' - [loadData()] Error in fetchAndLoadDCMSeg(searchObjRTSPred, imageIdsCT): ', error);
                        updateGUIElementsHelper.showToast('Error in loading predicted segmentation data', 3000);
                    }
                }
                try{
                    scribbleSegmentationId = scribbleSegmentationIdBase + '::' + cornerstone3D.utilities.uuidv4();
                    let { segReprUIDs} = await segmentationHelpers.addSegmentationToState(scribbleSegmentationId, cornerstone3DTools.Enums.SegmentationRepresentations.Contour);
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
                updateGUIElementsHelper.unshowLoaderAnimation();
                updateGUIElementsHelper.setSliceIdxHTMLForAllHTML();
                updateGUIElementsHelper.showToast(`Data loaded successfully (CT=${totalImagesIdsCT} slices, ROIs=${totalROIsRTSTRUCT})`, 3000, true);
                [windowLevelButton, contourSegmentationToolButton, sculptorToolButton, editBaseContourViaScribbleButton, showPETButton].forEach((buttonHTML) => {
                    if (buttonHTML === null) return;
                    buttonHTML.disabled = false;
                });
                // await updateGUIElementsHelper.takeSnapshots(config.viewPortIdsAll)
                await updateGUIElementsHelper.takeSnapshots([config.viewportDivId])

            }

        }else{
            updateGUIElementsHelper.showToast('No CT data available')
            await updateGUIElementsHelper.unshowLoaderAnimation()
        }
    }else{
        updateGUIElementsHelper.showToast('Default case not available. Select another case.')
        await updateGUIElementsHelper.unshowLoaderAnimation()
    }

    await updateGUIElementsHelper.unshowLoaderAnimation()
}

// ******************************** MAIN ********************************

async function setup(patientIdx){

    // Step 0 - Load orthanc data
    await apiEndpointHelpers.getDataURLs();
    await setupDropDownMenu(config.orthanDataURLS, patientIdx);
    await updateGUIElementsHelper.showLoaderAnimation()
    await updateGUIElementsHelper.unshowLoaderAnimation()
    
    // -------------------------------------------------> Step 1 - Init
    await cornerstoneInit();
    
    // // -------------------------------------------------> Step 2 - Do tooling stuff
    await getToolsAndToolGroup();    

    // // -------------------------------------------------> Step 3 - Make rendering engine
    setRenderingEngineAndViewports();
    
    // // -------------------------------------------------> Step 4 - Get .dcm data
    await fetchAndLoadData(patientIdx);
    setContouringButtonsLogic();
    keyboardEventsHelper.setMouseAndKeyboardEvents();

}

// Some debug params
config.setPatientIdx(16);
MODALITY_CONTOURS = MODALITY_SEG

if (process.env.NETLIFY === "true")
    config.setPatientIdx(0);
setup(config.patientIdx)



/**
TO-DO
1. [P] Make trsnsfer function for PET
2. [P] ORTHANC__DICOM_WEB__METADATA_WORKER_THREADS_COUNT = 1
3. [P] https://www.cornerstonejs.org/docs/examples/#polymorph-segmentation
    - https://github.com/cornerstonejs/cornerstone3D/issues/1351
4. Sometimes mouseUp event does not capture events
 */

/**
1. Function that resets viewports to default
 - resetView() --> self-defined
 - ??

2. showSliceIds()
 - need to connect this to an event that might be released when the scroll is done
*/

/**
 * To compile (from webpack.config.js) npx webpack --mode development --watch
 * To run: npm start
 */