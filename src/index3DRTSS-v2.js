import dicomParser from 'dicom-parser';
import * as dicomWebClient from "dicomweb-client";

import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstone3DTools from '@cornerstonejs/tools';
import * as cornerstoneAdapters from "@cornerstonejs/adapters";
import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import * as cornerstoneStreamingImageLoader from '@cornerstonejs/streaming-image-volume-loader';

import createImageIdsAndCacheMetaData from './helpers/createImageIdsAndCacheMetaData'; // https://github.com/cornerstonejs/cornerstone3D/blob/a4ca4dde651d17e658a4aec5a4e3ec1b274dc580/utils/demo/helpers/createImageIdsAndCacheMetaData.js
import setPetColorMapTransferFunctionForVolumeActor from './helpers/setPetColorMapTransferFunctionForVolumeActor'; //https://github.com/cornerstonejs/cornerstone3D/blob/v1.77.13/utils/demo/helpers/setPetColorMapTransferFunctionForVolumeActor.js
import setCtTransferFunctionForVolumeActor from './helpers/setCtTransferFunctionForVolumeActor'; // https://github.com/cornerstonejs/cornerstone3D/blob/v1.77.13/utils/demo/helpers/setCtTransferFunctionForVolumeActor.js

import * as dockerNames from 'docker-names'
const instanceName = dockerNames.getRandomName()
console.log(' ------------ instanceName: ', instanceName)


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
const INIT_BRUSH_SIZE = 5;

// Rendering + Volume + Segmentation ids
const renderingEngineId  = 'myRenderingEngine';
const toolGroupId        = 'STACK_TOOL_GROUP_ID';
const volumeLoaderScheme = 'cornerstoneStreamingImageVolume';
const volumeIdPETBase      = `${volumeLoaderScheme}:myVolumePET`; //+ cornerstone3D.utilities.uuidv4()
const volumeIdCTBase       = `${volumeLoaderScheme}:myVolumeCT`;
let volumeIdCT;
let volumeIdPET;

const scribbleSegmentationId = `SCRIBBLE_SEGMENTATION_ID`; // this should not change for different scribbles
let scribbleSegmentationUIDs;
let oldSegmentationId;
let oldSegmentationUIDs;

// Python server
const URL_PYTHON_SERVER = 'http://localhost:55000'
const ENDPOINT_PREPARE  = '/prepare'
const ENDPOINT_PROCESS  = '/process'
const KEY_DATA          = 'data'
const KEY_IDENTIFIER    = 'identifier'
const KEY_POINTS_3D     = 'points3D'
const KEY_SCRIB_TYPE    = 'scribbleType'
const METHOD_POST       = 'POST'
const HEADERS_JSON      = {'Content-Type': 'application/json',}

// Tools
const MODE_ACTIVE  = 'Active';
const MODE_PASSIVE = 'Passive';

// General
let fusedPETCT   = false;
let petBool      = false;

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
    // setButtonBoundaryColor(contourSegmentationToolButton, true);
    
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

    // Step 1.5 - Edit main contour vs scribble contour. Add buttons for that
    const choseContourToEditHTML = document.createElement('div');
    choseContourToEditHTML.style.display = 'flex';
    choseContourToEditHTML.style.flexDirection = 'row';

    // Step 1.5.1
    const paraEdit     = document.createElement('p');
    paraEdit.innerHTML = 'Edit Predicted Contour:';
    choseContourToEditHTML.appendChild(paraEdit);
    
    // Step 1.5.2
    const editBaseContourViaBrushButton     = document.createElement('button');
    editBaseContourViaBrushButton.id        = 'editBaseContourViaBrushButton';
    editBaseContourViaBrushButton.innerHTML = '(using brush)';
    editBaseContourViaBrushButton.disabled  = true;
    choseContourToEditHTML.appendChild(editBaseContourViaBrushButton);
    editBaseContourViaBrushButton.addEventListener('click', function() {
        if (oldSegmentationUID != undefined){
            cornerstone3DTools.segmentation.activeSegmentation.setActiveSegmentationRepresentation(oldSegmentationUID[0]);
            setButtonBoundaryColor(editBaseContourViaBrushButton, true);
            setButtonBoundaryColor(editBaseContourViaScribbleButton, false);
        }
    })
    
    // Step 1.5.3
    const paraEdit2 = document.createElement('p');
    paraEdit2.innerHTML = ' or ';
    choseContourToEditHTML.appendChild(paraEdit2);

    // Step 1.5.4
    const editBaseContourViaScribbleButton     = document.createElement('button');
    editBaseContourViaScribbleButton.id        = 'editBaseContourViaScribbleButton';
    editBaseContourViaScribbleButton.innerHTML = '(using AI-scribble)';
    choseContourToEditHTML.appendChild(editBaseContourViaScribbleButton);
    editBaseContourViaScribbleButton.addEventListener('click', function() {
        if (scribbleSegmentationUIDs != undefined){
            cornerstone3DTools.segmentation.activeSegmentation.setActiveSegmentationRepresentation(scribbleSegmentationUIDs[0]);
            setButtonBoundaryColor(editBaseContourViaBrushButton, false);
            setButtonBoundaryColor(editBaseContourViaScribbleButton, true);
        }
    });

    // Step 1.5.6 - Add checkboxes for fgd and bgd
    const scribbleCheckboxDiv = document.createElement('div');
    scribbleCheckboxDiv.style.display = 'flex';
    scribbleCheckboxDiv.style.flexDirection = 'column';
    choseContourToEditHTML.appendChild(scribbleCheckboxDiv);

    const fgdChecBoxParentDiv = document.createElement('div');
    fgdChecBoxParentDiv.style.display = 'flex';
    fgdChecBoxParentDiv.style.flexDirection = 'row';
    scribbleCheckboxDiv.appendChild(fgdChecBoxParentDiv);

    const bgdCheckboxParentDiv = document.createElement('div');
    bgdCheckboxParentDiv.style.display = 'flex';
    bgdCheckboxParentDiv.style.flexDirection = 'row';
    scribbleCheckboxDiv.appendChild(bgdCheckboxParentDiv);

    // Step 1.5.6.1 - Add checkbox for fgd
    const fgdCheckbox = document.createElement('input');
    fgdCheckbox.type = 'checkbox';
    fgdCheckbox.id = 'fgdCheckbox';
    fgdCheckbox.name = 'Foreground Scribble';
    fgdCheckbox.value = 'Foreground Scribble';
    fgdCheckbox.checked = true;
    fgdCheckbox.addEventListener('change', function() {
        if (this.checked){
            bgdCheckbox.checked = false;
        }
    });
    fgdChecBoxParentDiv.appendChild(fgdCheckbox);

    // Step 1.5.6.2 - Add label for fgd
    const fgdLabel = document.createElement('label');
    fgdLabel.htmlFor = 'fgdCheckbox';
    fgdLabel.style.color = 'goldenrod'; // '#DAA520', 'rgb(218, 165, 32)'
    fgdLabel.appendChild(document.createTextNode('Foreground Scribble'));
    fgdChecBoxParentDiv.appendChild(fgdLabel);
    

    // Step 1.5.6.3 - Add checkbox for bgd
    const bgdCheckbox = document.createElement('input');
    bgdCheckbox.type = 'checkbox';
    bgdCheckbox.id = 'bgdCheckbox';
    bgdCheckbox.name = 'Background Scribble';
    bgdCheckbox.value = 'Background Scribble';
    bgdCheckbox.checked = false;
    bgdCheckbox.addEventListener('change', function() {
        if (this.checked){
            fgdCheckbox.checked = false;
        }
    });
    bgdCheckboxParentDiv.appendChild(bgdCheckbox);

    // Step 1.5.6.4 - Add label for bgd
    const bgdLabel = document.createElement('label');
    bgdLabel.htmlFor = 'bgdCheckbox';
    bgdLabel.style.color = 'blue';
    bgdLabel.appendChild(document.createTextNode('Background Scribble'));
    bgdCheckboxParentDiv.appendChild(bgdLabel);


    // Step 1.99 - Add buttons to contouringButtonDiv
    contouringButtonDiv.appendChild(para);
    contouringButtonDiv.appendChild(contouringButtonInnerDiv);
    contouringButtonInnerDiv.appendChild(contourSegmentationToolButton);
    contouringButtonInnerDiv.appendChild(sculptorToolButton);
    contouringButtonInnerDiv.appendChild(noContouringButton);
    contouringButtonDiv.appendChild(choseContourToEditHTML);

    // Step 1.6 - Add contouringButtonDiv to contentDiv
    interactionButtonsDiv.appendChild(contouringButtonDiv); 
    
    return {noContouringButton, contourSegmentationToolButton, sculptorToolButton, editBaseContourViaBrushButton, editBaseContourViaScribbleButton};

}
const {noContouringButton, contourSegmentationToolButton, sculptorToolButton, editBaseContourViaBrushButton, editBaseContourViaScribbleButton} = createContouringHTML();

async function otherHTMLElements(patientIdx){

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
    const mouseHoverDiv = document.createElement('div');
    mouseHoverDiv.id = 'mouseHoverDiv';

    const canvasPosHTML = document.createElement('p');
    const ctValueHTML = document.createElement('p');
    const ptValueHTML = document.createElement('p');
    canvasPosHTML.innerText = 'Canvas position:';
    ctValueHTML.innerText = 'CT value:';
    ptValueHTML.innerText = 'PT value:';

    viewportIds.forEach((viewportId_, index) => {
        const viewportDiv = document.getElementById(viewportIds[index]);
        viewportDiv.addEventListener('mousemove', function(evt) {
            if (volumeIdCT != undefined && volumeIdPET != undefined){
                const volumeCTThis = cornerstone3D.cache.getVolume(volumeIdCT);
                const volumePTThis = cornerstone3D.cache.getVolume(volumeIdPET);
                if (volumeCTThis != undefined){
                    const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
                    const rect        = viewportDiv.getBoundingClientRect();
                    const canvasPos   = [Math.floor(evt.clientX - rect.left),Math.floor(evt.clientY - rect.top),];
                    const viewPortTmp = renderingEngine.getViewport(viewportIds[index]);
                    const worldPos    = viewPortTmp.canvasToWorld(canvasPos);

                    canvasPosHTML.innerText = `Canvas position: (${viewportIds[index]}) => (${canvasPos[0]}, ${canvasPos[1]})`;
                    ctValueHTML.innerText = `CT value: ${getValue(volumeCTThis, worldPos)}`;
                    if (volumePTThis != undefined)
                        {ptValueHTML.innerText = `PT value: ${getValue(volumePTThis, worldPos)}`;}
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
    const cases = Array.from({length: 10}, (_, i) => getDataURLs(i).caseName).filter(caseName => caseName.length > 0);
    cases.forEach((caseName, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.text = caseName;
        caseSelectionHTML.appendChild(option);
    });
    caseSelectionHTML.addEventListener('change', async function() {
        const caseNumber = parseInt(this.value);
        console.log('   -- caseNumber (for caseSelectionHTML): ', caseNumber);
        await fetchAndLoadData(caseNumber);
    });
    caseSelectionHTML.selectedIndex = patientIdx;

    // Step 99 - Add to contentDiv
    otherButtonsDiv.appendChild(caseSelectionHTML);
    otherButtonsDiv.appendChild(resetViewButton);
    otherButtonsDiv.appendChild(showPETButton);
    otherButtonsDiv.appendChild(mouseHoverDiv);
    interactionButtonsDiv.appendChild(otherButtonsDiv);

    return {caseSelectionHTML, resetViewButton, showPETButton};
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
        const contentDiv = document.getElementById(contentDivId);
        const contentDivRect = contentDiv.getBoundingClientRect();
        console.log(' -- contentDivRect: ', contentDivRect);

        // Step 5.1 - Position the loadingIndicatorDiv
        loadingIndicatorDiv.style.position = 'absolute';
        loadingIndicatorDiv.style.top = `${(contentDivRect.top + (contentDivRect.bottom - contentDivRect.top) / 2) - (loadingIndicatorDiv.offsetHeight / 2)}px`;
        loadingIndicatorDiv.style.left = `${(contentDivRect.left + (contentDivRect.right - contentDivRect.left) / 2) - (loadingIndicatorDiv.offsetWidth / 2)}px`;
        

        // Step 5.2 - place the grououtdiv on top of contentDiv
        grayOutDiv.style.top = `${contentDivRect.top}px`;
        grayOutDiv.style.left = `${contentDivRect.left}px`;
        grayOutDiv.style.width = `${contentDivRect.right - contentDivRect.left}px`;
        grayOutDiv.style.height = `${contentDivRect.bottom - contentDivRect.top}px`;
    }

    return {loaderDiv};
}

async function showLoaderAnimation() {

    const {loaderDiv} = await getLoaderHTML();
    if (loaderDiv) loaderDiv.style.display = 'block';
}


async function unshowLoaderAnimation() {

    const {loaderDiv} = await getLoaderHTML();
    if (loaderDiv) loaderDiv.style.display = 'none';
}

function createDebuggingButtons(){

    // Step 1 - Get contentDiv
    const contentDiv = document.getElementById(contentDivId);
    const debuggingButtonsDiv               = document.createElement('div');
    debuggingButtonsDiv.id                  = 'debuggingButtonsDiv';
    debuggingButtonsDiv.style.display       = 'flex';
    debuggingButtonsDiv.style.flexDirection = 'row';

    // Step 2.1 - Create a button to prepare and process
    const postButtonForPrepare     = document.createElement('button');
    postButtonForPrepare.id        = 'postButtonForPrepare';
    postButtonForPrepare.innerHTML = 'Prepare';
    postButtonForPrepare.addEventListener('click', async function() {
        const preparePayload = {'data': getDataURLs(1),'identifier': instanceName,}
        const response = await fetch('http://localhost:55000/prepare', {method: 'POST', headers: {'Content-Type': 'application/json',},body: JSON.stringify(preparePayload), credentials: 'include',});
        console.log(' \n ----------------- Python server stuff ----------------- \n')
        console.log('   -- [postButtonForPrepare] preparePayload: ', preparePayload);
        console.log('   -- [postButtonForPrepare] response: ', response);
        console.log('   -- [postButtonForPrepare] response.json(): ', await response.json());
    });

    // Step 2.2 - Create a button to process
    const postButtonForProcess     = document.createElement('button');
    postButtonForProcess.id        = 'postButtonForProcess';
    postButtonForProcess.innerHTML = 'Process';
    postButtonForProcess.addEventListener('click', async function() {
        const processPayload = {'data': {'points3D': [[1,1,1]]},'identifier': instanceName,}
        const response = await fetch('http://localhost:55000/process', {method: 'POST', headers: {'Content-Type': 'application/json',},body: JSON.stringify(processPayload),credentials: 'include',});
        console.log(' \n ----------------- Python server stuff ----------------- \n')
        console.log('   -- [postButtonForProcess] processPayload: ', processPayload);
        console.log('   -- [postButtonForProcess] response: ', response);
        console.log('   -- [postButtonForProcess] response.json(): ', await response.json());
    });

    debuggingButtonsDiv.appendChild(postButtonForPrepare);
    debuggingButtonsDiv.appendChild(postButtonForProcess);
    contentDiv.appendChild(debuggingButtonsDiv);
}
// createDebuggingButtons();

/****************************************************************
*                             UTILS  
*****************************************************************/

function getDataURLs(caseNumber, verbose = false){

    let searchObjCT  = {StudyInstanceUID: '', SeriesInstanceUID:'', SOPInstanceUID:'', wadoRsRoot: ''};
    let searchObjPET = {StudyInstanceUID: '', SeriesInstanceUID:'', SOPInstanceUID:'', wadoRsRoot: ''};
    let searchObjRTS = {StudyInstanceUID: '', SeriesInstanceUID:'', SOPInstanceUID:'', wadoRsRoot: ''};
    let caseName     = '';

    if (process.env.NETLIFY === "true"){
    // if (true){ //DEBUG

        if (verbose)        
            console.log(' - [getData()] Running on Netlify. Getting data from cloudfront for caseNumber: ', caseNumber);
        if (caseNumber == 0){   
            caseName = 'C3D - CT + PET';
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
        // https://www.cornerstonejs.org/live-examples/segmentationvolume
        else if (caseNumber == 1){
            caseName = 'C3D - Abdominal CT + RTSS';
            searchObjCT = {
                StudyInstanceUID:"1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458",
                SeriesInstanceUID:"1.3.6.1.4.1.14519.5.2.1.40445112212390159711541259681923198035",
                wadoRsRoot: "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
            },
            searchObjRTS = {
                StudyInstanceUID:"1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458",
                SeriesInstanceUID:"1.2.276.0.7230010.3.1.3.481034752.2667.1663086918.611582",
                SOPInstanceUID:"1.2.276.0.7230010.3.1.4.481034752.2667.1663086918.611583",
                wadoRsRoot: "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
            }
        }
        // https://www.cornerstonejs.org/live-examples/segmentationvolume
        else if (caseNumber == 2){
            caseName = 'C3D - MR + RTSS';
            searchObjCT = {
                StudyInstanceUID:"1.3.12.2.1107.5.2.32.35162.30000015050317233592200000046",
                SeriesInstanceUID:"1.3.12.2.1107.5.2.32.35162.1999123112191238897317963.0.0.0",
                wadoRsRoot: "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
            },
            searchObjRTS = {
                StudyInstanceUID:"1.3.12.2.1107.5.2.32.35162.30000015050317233592200000046",
                SeriesInstanceUID:"1.2.276.0.7230010.3.1.3.296485376.8.1542816659.201008",
                SOPInstanceUID:"1.2.276.0.7230010.3.1.4.296485376.8.1542816659.201009",
                wadoRsRoot: "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
            }
        }
    }
    else {
        if (verbose)
            console.log(' - [getData()] Running on localhost. Getting data from local orthanc.')

        // ProstateX-004 (MR)
        if (caseNumber == 0){
            caseName = 'ProstateX-004';
            searchObjCT = {
                StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7311.5101.170561193612723093192571245493',
                SeriesInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7311.5101.206828891270520544417996275680',
                wadoRsRoot: `${window.location.origin}/dicom-web`,
              }
            // --> (Try in postman) http://localhost:8042/dicom-web/studies/1.3.6.1.4.1.14519.5.2.1.7311.5101.170561193612723093192571245493/series/1.3.6.1.4.1.14519.5.2.1.7311.5101.206828891270520544417996275680/metadata 
        }
        // HCAI-Interactive-XX
        else if (caseNumber == 1){
            caseName = 'HCAI-Interactive-XX (CT + PET)';
            // HCAI-Interactive-XX (PET)
            searchObjPET['StudyInstanceUID'] = '1.2.752.243.1.1.20240123155004085.1690.65801';
            searchObjPET['SeriesInstanceUID'] = '1.2.752.243.1.1.20240123155004085.1700.14027';
            searchObjPET['wadoRsRoot'] = `${window.location.origin}/dicom-web`;
            // searchObjPET = {
            //     StudyInstanceUID: '1.2.752.243.1.1.20240123155004085.1690.65801',
            //     SeriesInstanceUID:'1.2.752.243.1.1.20240123155004085.1700.14027',
            //     wadoRsRoot:  `${window.location.origin}/dicom-web`,
            // }
            //// --> (Try in postman) http://localhost:8042/dicom-web/studies/1.2.752.243.1.1.20240123155004085.1690.65801/series/1.2.752.243.1.1.20240123155004085.1700.14027/metadata

            // HCAI-Interactive-XX (CT)
            searchObjCT['StudyInstanceUID'] = '1.2.752.243.1.1.20240123155004085.1690.65801';
            searchObjCT['SeriesInstanceUID'] = '1.2.752.243.1.1.20240123155006526.5320.21561';
            searchObjCT['wadoRsRoot'] = `${window.location.origin}/dicom-web`;
            // searchObjCT = {
            //     StudyInstanceUID: '1.2.752.243.1.1.20240123155004085.1690.65801',
            //     SeriesInstanceUID:'1.2.752.243.1.1.20240123155006526.5320.21561',
            //     wadoRsRoot:  `${window.location.origin}/dicom-web`,
            // }
            //// --> (Try in postman) http://localhost:8042/dicom-web/studies/1.2.752.243.1.1.20240123155004085.1690.65801/series/1.2.752.243.1.1.20240123155004085.1700.14027/metadata

            // searchObjRTS = {}
        }
        // https://www.cornerstonejs.org/live-examples/segmentationvolume
        else if (caseNumber == 2){
            caseName = 'C3D - CT + RTSS';
            searchObjCT['StudyInstanceUID']  = '1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458'
            searchObjCT['SeriesInstanceUID'] = '1.3.6.1.4.1.14519.5.2.1.40445112212390159711541259681923198035'
            searchObjCT['wadoRsRoot']        = "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
            // searchObjCT = {
            //     StudyInstanceUID:"1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458",
            //     SeriesInstanceUID:"1.3.6.1.4.1.14519.5.2.1.40445112212390159711541259681923198035",
            //     wadoRsRoot: "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
            //     // wadoRsRoot: "https://d33do7qe4w26qo.cloudfront.net/dicomwebb"
            // },

            searchObjRTS['StudyInstanceUID']  = "1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458"
            searchObjRTS['SeriesInstanceUID'] = "1.2.276.0.7230010.3.1.3.481034752.2667.1663086918.611582"
            searchObjRTS['SOPInstanceUID']    = "1.2.276.0.7230010.3.1.4.481034752.2667.1663086918.611583"
            searchObjRTS['wadoRsRoot']        = "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
            // searchObjRTS = {
            //     StudyInstanceUID:"1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458",
            //     SeriesInstanceUID:"1.2.276.0.7230010.3.1.3.481034752.2667.1663086918.611582",
            //     SOPInstanceUID:"1.2.276.0.7230010.3.1.4.481034752.2667.1663086918.611583",
            //     wadoRsRoot: "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
            // }
        }  
        
    }

    return {searchObjCT, searchObjPET, searchObjRTS, caseName};
}

function getIndex(volume, worldPos) {

    const {imageData} = volume;
    const index = imageData.worldToIndex(worldPos);
    return index
}

function getValue(volume, worldPos) {
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
    
    // Step 1 - Get all segmentationRepresentations
    const allSegReps = cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations() // alternatively .state.getSegmentations()
    const allSegRepsList = allSegReps['STACK_TOOL_GROUP_ID'] 
    
    // Step 2 - Get all segmentationIds and segmentationUIDs
    let allSegIds=[], allSegUIDs=[];
    if (allSegRepsList != undefined){
        allSegIds  = allSegRepsList.map(x => x.segmentationId)
        allSegUIDs = allSegRepsList.map(x => x.segmentationRepresentationUID
        )
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
    if (fgdCheckbox.checked) return 'fgd';
    if (bgdCheckbox.checked) return 'bgd';
    return '';
}

async function makeRequestToPrepare(caseNumber){

    let requestStatus = false;
    try{
        const preparePayload = {[KEY_DATA]: getDataURLs(caseNumber),[KEY_IDENTIFIER]: instanceName,}
        const response = await fetch(URL_PYTHON_SERVER + ENDPOINT_PREPARE, {method: METHOD_POST, headers: HEADERS_JSON, body: JSON.stringify(preparePayload), credentials: 'include',}); // credentials: 'include' is important for cross-origin requests
        requestStatus = true;
        console.log(' \n ----------------- Python server (/prepare) ----------------- \n')
        console.log('   -- [makeRequestToPrepare()] preparePayload: ', preparePayload);
        console.log('   -- [makeRequestToPrepare()] response: ', response);
        console.log('   -- [makeRequestToPrepare()] response.json(): ', await response.json());
    } catch (error){
        requestStatus = false;
        console.log('   -- [makeRequestToPrepare()] Error: ', error);
        showToast('Python server - /prepare failed', 3000)
    }

    return requestStatus;
}

async function makeRequestToProcess(points3D, scribbleAnnotationUID){

    let requestStatus = false;
    try{

        // Step 1 - Make a request to /process
        const scribbleType = await getScribbleType();
        const processPayload = {[KEY_DATA]: {[KEY_POINTS_3D]: points3D, [KEY_SCRIB_TYPE]:scribbleType},[KEY_IDENTIFIER]: instanceName,}
        await showLoaderAnimation();
        const response = await fetch(URL_PYTHON_SERVER + ENDPOINT_PROCESS, {method: METHOD_POST, headers: HEADERS_JSON, body: JSON.stringify(processPayload), credentials: 'include',}); // credentials: 'include' is important for cross-origin requests
        const responseJSON = await response.json();
        requestStatus = true;
        console.log(' \n ----------------- Python server (/process) ----------------- \n')
        console.log('   -- [makeRequestToProcess()] processPayload: ', processPayload);
        console.log('   -- [makeRequestToProcess()] response: ', response);
        console.log('   -- [makeRequestToProcess()] response.json(): ', responseJSON);

        // Step 2 - Remove old segmentation and add new segmentation
        console.log('\n --------------- Removing old segmentation ...  ---------------: ', scribbleAnnotationUID)
        await cornerstone3DTools.annotation.state.removeAnnotation(scribbleAnnotationUID);
        await unshowLoaderAnimation();

    } catch (error){
        requestStatus = false;
        console.log('   -- [makeRequestToProcess()] Error: ', error);
        showToast('Python server - /process failed', 3000)
    }

    return requestStatus;
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
    cornerstone3DTools.addTool(planarFreeHandRoiTool);
    
    // Step 4 - Make toolGroup
    const toolGroup = cornerstone3DTools.ToolGroupManager.createToolGroup(toolGroupId);
    toolGroup.addTool(windowLevelTool.toolName);
    toolGroup.addTool(panTool.toolName);
    toolGroup.addTool(zoomTool.toolName);
    toolGroup.addTool(stackScrollMouseWheelTool.toolName);
    toolGroup.addTool(probeTool.toolName);
    toolGroup.addTool(referenceLinesTool.toolName);
    toolGroup.addTool(segmentationDisplayTool.toolName);
    toolGroup.addTool(brushTool.toolName);
    toolGroup.addToolInstance(strBrushCircle, brushTool.toolName, { activeStrategy: 'FILL_INSIDE_CIRCLE', brushSize:5});
    toolGroup.addToolInstance(strEraserCircle, brushTool.toolName, { activeStrategy: 'ERASE_INSIDE_CIRCLE', brushSize:5});
    cornerstone3DTools.utilities.segmentation.setBrushSizeForToolGroup(toolGroupId, INIT_BRUSH_SIZE);
    toolGroup.addTool(planarFreeHandRoiTool.toolName);

    // Step 5 - Set toolGroup elements as active/passive
    toolGroup.setToolPassive(windowLevelTool.toolName);// Left Click
    toolGroup.setToolActive(panTool.toolName, {bindings: [{mouseButton: cornerstone3DTools.Enums.MouseBindings.Auxiliary, },],}); // Middle Click
    toolGroup.setToolActive(zoomTool.toolName, {bindings: [{mouseButton: cornerstone3DTools.Enums.MouseBindings.Secondary, },],}); // Right Click    
    toolGroup.setToolActive(stackScrollMouseWheelTool.toolName);
    toolGroup.setToolEnabled(probeTool.toolName);
    toolGroup.setToolEnabled(referenceLinesTool.toolName);
    toolGroup.setToolConfiguration(referenceLinesTool.toolName, {sourceViewportId: axialID,});

    toolGroup.setToolEnabled(segmentationDisplayTool.toolName);
    toolGroup.setToolPassive(strBrushCircle); // , { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });
    toolGroup.setToolPassive(strEraserCircle); // , { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });
    toolGroup.setToolActive(planarFreeHandRoiTool.toolName);
    toolGroup.setToolConfiguration(planarFreeHandRoiTool.toolName, {calculateStats: false,});

    // Step 6 - Add events
    [axialDiv, sagittalDiv, coronalDiv].forEach((viewportDiv, index) => {
        viewportDiv.addEventListener('mouseenter', function() {
            toolGroup.setToolConfiguration(referenceLinesTool.toolName, {sourceViewportId: viewportIds[index]});
        });
    });
    

    // Step 6 - Setup some event listeners
    // Listen for keydown event
    window.addEventListener('keydown', function(event) {
        // For brush tool radius        
        const toolGroup = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupId);
        if (toolGroup.toolOptions[strBrushCircle].mode === MODE_ACTIVE || toolGroup.toolOptions[strEraserCircle].mode === MODE_ACTIVE){
            const segUtils       = cornerstone3DTools.utilities.segmentation;
            let initialBrushSize = segUtils.getBrushSizeForToolGroup(toolGroupId);
            if (event.key === '+')
                segUtils.setBrushSizeForToolGroup(toolGroupId, initialBrushSize + 1);
            else if (event.key === '-'){
                if (initialBrushSize > 1)
                    segUtils.setBrushSizeForToolGroup(toolGroupId, initialBrushSize - 1);
            }
            let newBrushSize = segUtils.getBrushSizeForToolGroup(toolGroupId);
            showToast(`Brush size: ${newBrushSize}`);
        }
    });

    return {toolGroup, windowLevelTool, panTool, zoomTool, stackScrollMouseWheelTool, probeTool, referenceLinesTool, segmentation, segmentationDisplayTool, brushTool, planarFreeHandRoiTool, toolState};
}

// function setContouringButtonsLogic(scribbleSegmentationUIDs, oldSegmentationUIDs){
function setContouringButtonsLogic(){

    // Step 0 - Init
    const planarFreehandROITool = cornerstone3DTools.PlanarFreehandROITool;
    const windowLevelTool       = cornerstone3DTools.WindowLevelTool;
    const toolGroup             = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupId);
    // console.log(' - [setContouringButtonsLogic()] scribbleSegmentationUIDs: ', scribbleSegmentationUIDs, '|| oldSegmentationUIDs: ', oldSegmentationUIDs);

    // Step 2 - Add event listeners to buttons        
    [noContouringButton, contourSegmentationToolButton, sculptorToolButton, editBaseContourViaScribbleButton].forEach((buttonHTML, buttonId) => {
        if (buttonHTML === null) return;
        
        buttonHTML.addEventListener('click', async function() {
            if (buttonId === 0) {
                toolGroup.setToolPassive(planarFreehandROITool.toolName);
                toolGroup.setToolPassive(strEraserCircle);
                toolGroup.setToolPassive(strBrushCircle);
                toolGroup.setToolActive(windowLevelTool.toolName, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });                    
                
                setButtonBoundaryColor(editBaseContourViaBrushButton, false);
                setButtonBoundaryColor(editBaseContourViaScribbleButton, false);
                setButtonBoundaryColor(sculptorToolButton, false);
                setButtonBoundaryColor(contourSegmentationToolButton, false);
                setButtonBoundaryColor(noContouringButton, true);
            }
            else if (buttonId === 1) {
                toolGroup.setToolPassive(planarFreehandROITool.toolName);
                toolGroup.setToolPassive(windowLevelTool.toolName);
                toolGroup.setToolPassive(strEraserCircle);
                toolGroup.setToolActive(strBrushCircle, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });    
                cornerstone3DTools.segmentation.activeSegmentation.setActiveSegmentationRepresentation(toolGroupId, oldSegmentationUIDs[0]);
                
                setButtonBoundaryColor(editBaseContourViaBrushButton, true);
                setButtonBoundaryColor(editBaseContourViaScribbleButton, false);
                setButtonBoundaryColor(noContouringButton, false);
                setButtonBoundaryColor(sculptorToolButton, false);
                setButtonBoundaryColor(contourSegmentationToolButton, true);
            }
            else if (buttonId === 2) {
                toolGroup.setToolPassive(planarFreehandROITool.toolName);
                toolGroup.setToolPassive(windowLevelTool.toolName);
                toolGroup.setToolPassive(strBrushCircle);
                toolGroup.setToolActive(strEraserCircle, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], }); 
                cornerstone3DTools.segmentation.activeSegmentation.setActiveSegmentationRepresentation(toolGroupId, oldSegmentationUIDs[0]);
                
                setButtonBoundaryColor(editBaseContourViaBrushButton, true);
                setButtonBoundaryColor(editBaseContourViaScribbleButton, false);
                setButtonBoundaryColor(noContouringButton, false);
                setButtonBoundaryColor(contourSegmentationToolButton, false);
                setButtonBoundaryColor(sculptorToolButton, true);
            }
            else if (buttonId === 3) {
                toolGroup.setToolPassive(windowLevelTool.toolName);
                toolGroup.setToolPassive(strEraserCircle);
                toolGroup.setToolPassive(strBrushCircle);
                toolGroup.setToolActive(planarFreehandROITool.toolName, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });
                const {allSegIds, allSegUIDs} = await getSegmentationIdsAndUIDs();
                const scribbleSegmentationUID = await getSegmentationUIDforScribbleSegmentationId();
                cornerstone3DTools.segmentation.activeSegmentation.setActiveSegmentationRepresentation(toolGroupId, scribbleSegmentationUID);

                setButtonBoundaryColor(noContouringButton, false);
                setButtonBoundaryColor(sculptorToolButton, false);
                setButtonBoundaryColor(contourSegmentationToolButton, false);
                setButtonBoundaryColor(editBaseContourViaBrushButton, false);
                setButtonBoundaryColor(editBaseContourViaScribbleButton, true);

                showToast('Scribble tool activated.', 3000);
            }
        });
    });

    // Step 3 - Add event listeners for mouseup event
    [axialDiv, sagittalDiv, coronalDiv].forEach((viewportDiv, index) => {
        viewportDiv.addEventListener('mouseup', function() {
            setTimeout(async () => {
                const freehandRoiToolMode = toolGroup.toolOptions[planarFreehandROITool.toolName].mode;
                if (freehandRoiToolMode === MODE_ACTIVE){
                    const allAnnotations = cornerstone3DTools.annotation.state.getAllAnnotations();
                    const scribbleAnnotations = allAnnotations.filter(x => x.metadata.toolName === planarFreehandROITool.toolName);
                    if (scribbleAnnotations.length > 0){
                        const scribbleAnnotationUID = scribbleAnnotations[0].annotationUID;
                        if (scribbleAnnotations.length > 0){
                            const polyline           = scribbleAnnotations[0].data.contour.polyline;
                            const points3D = polyline.map(function(point) {
                                return getIndex(cornerstone3D.cache.getVolume(volumeIdCT), point);
                            });
                            const points3DInt = points3D.map(x => x.map(y => Math.floor(y)));
                            await makeRequestToProcess(points3DInt, scribbleAnnotationUID);
                        }
                    } else {
                        const allAnnotations = cornerstone3DTools.annotation.state.getAllAnnotations();
                        console.log(' - [setContouringButtonsLogic()] allAnnotations: ', allAnnotations);
                    }
                }
            }, 100);
        });
    });
}

function setScribbleButtonsLogic(){

    const toolGroup = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupId);
}

function setRenderingEngineAndViewports(){

    const renderingEngine = new cornerstone3D.RenderingEngine(renderingEngineId);

    // Step 2.5.1 - Add image planes to rendering engine
    const viewportInputs = [
        {element: axialDiv   , viewportId: axialID   , type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.AXIAL},},
        {element: sagittalDiv, viewportId: sagittalID, type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.SAGITTAL},},
        {element: coronalDiv , viewportId: coronalID , type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.CORONAL},},
    ]
    renderingEngine.setViewports(viewportInputs);
    
    // Step 2.5.2 - Add toolGroup to rendering engine
    const toolGroup = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupId);
    viewportIds.forEach((viewportId) =>
        toolGroup.addViewport(viewportId, renderingEngineId)
    );

    // return {renderingEngine};
}

async function fetchAndLoadDCMSeg(searchObj, imageIds){

    // Step 1 - Get search parameters
    const client = new dicomWebClient.api.DICOMwebClient({
        url: searchObj.wadoRsRoot
    });
    const arrayBuffer = await client.retrieveInstance({
        studyInstanceUID: searchObj.StudyInstanceUID,
        seriesInstanceUID: searchObj.SeriesInstanceUID,
        sopInstanceUID: searchObj.SOPInstanceUID
    });

    // Step 2 - Add it to GUI
    oldSegmentationId = "LOAD_SEGMENTATION_ID:" + cornerstone3D.utilities.uuidv4();

    // Step 3 - Generate tool state
    const generateToolState =
        await cornerstoneAdapters.adaptersSEG.Cornerstone3D.Segmentation.generateToolState(
            imageIds,
            arrayBuffer,
            cornerstone3D.metaData
        );

    const {derivedVolume, segReprUID} = await addSegmentationToState(oldSegmentationId, cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap);
    const derivedVolumeScalarData = derivedVolume.getScalarData();
    derivedVolumeScalarData.set(new Uint8Array(generateToolState.labelmapBufferArray[0]));
    
    oldSegmentationUIDs = segReprUID;

}

async function addSegmentationToState(segmentationIdParam, segType){
    // segType = cornerstone3DTools.Enums.SegmentationRepresentations.{Labelmap, Contour}

    // Step 0 - Init
    let derivedVolume;

    // Step 1 - Create a segmentation volume
    if (segType === cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap)
        derivedVolume = await cornerstone3D.volumeLoader.createAndCacheDerivedSegmentationVolume(volumeIdCT, {volumeId: segmentationIdParam,});

    // Step 2 - Add the segmentation to the state
    if (segType === cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap)
        cornerstone3DTools.segmentation.addSegmentations([{ segmentationId:segmentationIdParam, representation: { type: segType, data: { volumeId: segmentationIdParam, }, }, },]);
    else if (segType === cornerstone3DTools.Enums.SegmentationRepresentations.Contour)
        cornerstone3DTools.segmentation.addSegmentations([{ segmentationId:segmentationIdParam, representation: { type: segType, }, },]);

    // Step 3 - Set the segmentation representation to the toolGroup
    const segReprUID = await cornerstone3DTools.segmentation.addSegmentationRepresentations(toolGroupId, [
        {segmentationId:segmentationIdParam, type: segType,},
    ]);
    // console.log(' - [addSegmentationToState()] segType: ', segType, ' || segmentationIdParam: ',segmentationIdParam, ' || derivedVolume: ', derivedVolume, ' || segReprUID: ', segReprUID)

    // Step 4 - More stuff for Contour
    if (segType === cornerstone3DTools.Enums.SegmentationRepresentations.Contour){
        const segmentation = cornerstone3DTools.segmentation;
        segmentation.activeSegmentation.setActiveSegmentationRepresentation(toolGroupId,segReprUID[0]);
        segmentation.segmentIndex.setActiveSegmentIndex(segmentationIdParam, 1);
    }
    
    return {derivedVolume, segReprUID}

}

// (Sub) MAIN FUNCTION
async function restart() {
    
    console.log(' \n ----------------- restart() ----------------- \n')

    // Step 1.0 - Get all segmentationIds
    const {allSegIds} = await getSegmentationIdsAndUIDs(); // call this before removing segmentations from toolGroup

    // Step 1.1 - Remove segmentations from toolGroup
    cornerstone3DTools.segmentation.removeSegmentationsFromToolGroup(toolGroupId);

    // Step 1.2 - Remove segmentations from state
    allSegIds.forEach(segmentationId => {
        console.log(' - [restart()] Removing segmentationId: ', segmentationId)
        cornerstone3DTools.segmentation.state.removeSegmentation(segmentationId);
    });

    // Step 2.1 - Remove volumeActors from viewports
    const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);
    viewportIds.forEach((viewportId) => {
        const viewportTmp = renderingEngine.getViewport(viewportId);
        if (volumeIdCT != undefined)
            viewportTmp.removeVolumeActors([volumeIdCT], true);
        if (volumeIdPET != undefined)
            viewportTmp.removeVolumeActors([volumeIdPET], true);
    });

    // Step 3 - Clear cache (images and volumes)
    cornerstone3D.cache.purgeCache(); // cornerstone3D.cache.getVolumes(), cornerstone3D.cache.getCacheSize()

    // Step 4 - Other UI stuff
    [noContouringButton, contourSegmentationToolButton, sculptorToolButton, editBaseContourViaBrushButton, showPETButton].forEach((buttonHTML) => {
        if (buttonHTML === null) return;
        setButtonBoundaryColor(buttonHTML, false);
    });
    
    fusedPETCT   = false;
    petBool      = false;
    oldSegmentationId        = undefined;
    oldSegmentationUIDs      = undefined;
    scribbleSegmentationUIDs = undefined;
    volumeIdCT  = undefined;
    volumeIdPET = undefined;


    // Step 5 - Other stuff
    // setToolsAsActivePassive(true);
    const stackScrollMouseWheelTool = cornerstone3DTools.StackScrollMouseWheelTool;
    const toolGroup = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupId);
    toolGroup.setToolPassive(stackScrollMouseWheelTool.toolName);

}

// MAIN FUNCTION
async function fetchAndLoadData(caseNumber){

    await restart();
    console.log(' \n ----------------- Getting .dcm data ----------------- \n')
    
    // Step 1 - Get search parameters
    const {searchObjCT, searchObjPET, searchObjRTS} = getDataURLs(caseNumber, true);
    console.log(' - [loadData()] searchObjCT: ', searchObjCT);

    // Step 2.1 - Create volume for CT
    if (searchObjCT.wadoRsRoot.length > 0){

        // Step 2.1.0 - Init for CT load
        const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);

        // Step 2.1.1 - Load CT data (in python server)
        makeRequestToPrepare(caseNumber)

        // Step 2.1.2 - Load CT data
        volumeIdCT     = volumeIdCTBase + cornerstone3D.utilities.uuidv4();
        let ctLoadBool = false;
        let imageIdsCT = [];
        try{
            imageIdsCT = await createImageIdsAndCacheMetaData(searchObjCT);
            ctLoadBool = true;
        } catch (error){
            console.error(' - [loadData()] Error in createImageIdsAndCacheMetaData(searchObjCT): ', error);
            showToast('Error in loading CT data', 3000);
        }
        
        if (ctLoadBool){
            const volumeCT   = await cornerstone3D.volumeLoader.createAndCacheVolume(volumeIdCT, { imageIds:imageIdsCT });
            volumeCT.load();

            // Step 2.2 - Create volume for PET
            if (searchObjPET.wadoRsRoot.length > 0){
                volumeIdPET      = volumeIdPETBase + cornerstone3D.utilities.uuidv4();
                let petLoadBool  = false;
                let imageIdsPET  = [];
                try{
                    imageIdsPET = await createImageIdsAndCacheMetaData(searchObjPET);
                    petLoadBool = true;
                } catch(error){
                    console.error(' - [loadData()] Error in createImageIdsAndCacheMetaData(searchObjPET): ', error);
                    showToast('Error in loading PET data', 3000);
                }
                if (petLoadBool){
                    const volumePT    = await cornerstone3D.volumeLoader.createAndCacheVolume(volumeIdPET, { imageIds: imageIdsPET });
                    volumePT.load();
                    petBool = true;
                }
            }

            // Step 3 - Set volumes for viewports
            await cornerstone3D.setVolumesForViewports(renderingEngine, [{ volumeId:volumeIdCT}, ], viewportIds, true);
            
            // Step 4 - Render viewports
            await renderingEngine.renderViewports(viewportIds);

            // Step 5 - setup segmentation
            console.log(' \n ----------------- Segmentation stuff ----------------- \n')
            if (searchObjRTS.wadoRsRoot.length > 0){
                await fetchAndLoadDCMSeg(searchObjRTS, imageIdsCT)
            }
            let { segReprUID: scribbleSegmentationUIDs } = await addSegmentationToState(scribbleSegmentationId, cornerstone3DTools.Enums.SegmentationRepresentations.Contour);
            cornerstone3DTools.segmentation.activeSegmentation.setActiveSegmentationRepresentation(toolGroupId, scribbleSegmentationUIDs[0]);
            editBaseContourViaScribbleButton.click(); // not doing this means clicking on the button twice
            
            // Step 6 - Set tools as active/passive
            const stackScrollMouseWheelTool = cornerstone3DTools.StackScrollMouseWheelTool;
            const toolGroup = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupId);
            toolGroup.setToolActive(stackScrollMouseWheelTool.toolName);
            
            // Step 99 - Done
            showToast('Data loaded successfully', 3000, true);
        }

    }else{
        showToast('No CT data available')
    }
}

/****************************************************************
*                             MAIN  
*****************************************************************/
async function setup(patientIdx){

    // -------------------------------------------------> Step 1 - Init
    await cornerstoneInit();
    
    // -------------------------------------------------> Step 2 - Do tooling stuff
    await getToolsAndToolGroup();    

    // -------------------------------------------------> Step 3 - Make rendering engine
    setRenderingEngineAndViewports();
    
    // -------------------------------------------------> Step 4 - Get .dcm data
    await fetchAndLoadData(patientIdx);
    setContouringButtonsLogic();

}

const patientIdx = 2;
const {showPETButton} = await otherHTMLElements(patientIdx);
setup(patientIdx)



/**
TO-DO
1. [D] Handle brush size going negative
2. [P] Make trsnsfer function for PET
3. [D] Make segmentation uneditable.
4. [P] Add fgd and bgd buttons
5. [P] Check why 'C3D - CT + RTSS' has a slightly displaced RTSS
*/