import dicomParser from 'dicom-parser';
import * as dicomWebClient from "dicomweb-client";

import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstone3DTools from '@cornerstonejs/tools';
import * as cornerstoneAdapters from "@cornerstonejs/adapters";
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
const volumeIdPETBase      = `${volumeLoaderScheme}:myVolumePET`; //+ cornerstone3D.utilities.uuidv4()
const volumeIdCTBase       = `${volumeLoaderScheme}:myVolumeCT`;
let volumeIdCT;
let volumeIdPET;

const scribbleSegmentationId     = `SEGMENTATION_ID`;
let scribbleSegmentationUID;
let scribbleSegmentationRepresentationObj;
let oldSegmentationId;
let oldSegmentationUID;
let oldSegmentationRepresentationObj;

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
    let caseName     = '';

    if (process.env.NETLIFY === "true"){
    // if (true){ //DEBUG

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
            caseName = 'C3D - CT + RTSS';
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
        
    }

    return {searchObjCT, searchObjPET, searchObjRTS, caseName};
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
    // console.log('   -- Toast: ', message);
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
    setButtonBoundaryColor(contourSegmentationToolButton, true);
    
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
    setButtonBoundaryColor(editBaseContourViaScribbleButton, true);
    editBaseContourViaScribbleButton.addEventListener('click', function() {
        if (scribbleSegmentationUID != undefined){
            cornerstone3DTools.segmentation.activeSegmentation.setActiveSegmentationRepresentation(scribbleSegmentationUID[0]);
            setButtonBoundaryColor(editBaseContourViaBrushButton, false);
            setButtonBoundaryColor(editBaseContourViaScribbleButton, true);
        }
    });

    // Step 1.99 - Add buttons to contouringButtonDiv
    contouringButtonDiv.appendChild(para);
    contouringButtonDiv.appendChild(contouringButtonInnerDiv);
    contouringButtonInnerDiv.appendChild(contourSegmentationToolButton);
    contouringButtonInnerDiv.appendChild(sculptorToolButton);
    contouringButtonInnerDiv.appendChild(noContouringButton);
    contouringButtonDiv.appendChild(choseContourToEditHTML);

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

    // Step 99 - Add to contentDiv
    otherButtonsDiv.appendChild(caseSelectionHTML);
    otherButtonsDiv.appendChild(resetViewButton);
    otherButtonsDiv.appendChild(showPETButton);
    otherButtonsDiv.appendChild(mouseHoverDiv);
    interactionButtonsDiv.appendChild(otherButtonsDiv);

    return {caseSelectionHTML, resetViewButton, showPETButton};
}
const {caseSelectionHTML, resetViewButton, showPETButton} = otherHTMLElements();

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
    toolGroup.addTool(brushTool.toolName);
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

function setRenderingEngineAndViewports(toolGroup){

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

    const {derivedVolume, segUID} = await addSegmentationToState(oldSegmentationId);
    const derivedVolumeScalarData = derivedVolume.getScalarData();
    derivedVolumeScalarData.set(new Uint8Array(generateToolState.labelmapBufferArray[0]));
    
    oldSegmentationUID = segUID;

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

    // Step 4 - Other UI stuff
    setButtonBoundaryColor(showPETButton, false);

}

async function addSegmentationToState(segmentationIdParam){

    // Step 1 - Create a segmentation volume
    const derivedVolume = await cornerstone3D.volumeLoader.createAndCacheDerivedSegmentationVolume(volumeIdCT, {volumeId: segmentationIdParam,});

    // Step 2 - Add the segmentation to the state
    cornerstone3DTools.segmentation.addSegmentations([{ segmentationId:segmentationIdParam, representation: { type: cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap, data: { volumeId: segmentationIdParam, }, }, },]);

    // Step 3 - Set the segmentation representation to the toolGroup
    const segUID = await cornerstone3DTools.segmentation.addSegmentationRepresentations(toolGroupId, [
        {segmentationId:segmentationIdParam, type: cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap,},
    ]);

    console.log(' - [addSegmentationToState()] derivedVolume: ', derivedVolume)
    return {derivedVolume, segUID}

}

// MAIN FUNCTION
async function fetchAndLoadData(caseNumber){

    console.log(' \n ----------------- Getting .dcm data ----------------- \n')
    restart();

    // Step 1 - Get search parameters
    const {searchObjCT, searchObjPET, searchObjRTS} = getDataURLs(caseNumber);
    console.log(' - [loadData()] searchObjCT: ', searchObjCT);

    // Step 2.1 - Create volume for CT
    if (Object.keys(searchObjCT).length > 0){

        const renderingEngine = cornerstone3D.getRenderingEngine(renderingEngineId);

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

        // Step 5 - setup segmentation
        console.log(' \n ----------------- Segmentation stuff ----------------- \n')
        if (Object.keys(searchObjRTS).length > 0){
            await fetchAndLoadDCMSeg(searchObjRTS, imageIdsCT)
        }
        let { segUID: scribbleSegmentationUID } = await addSegmentationToState(scribbleSegmentationId);
        console.log(' - scribbleSegmentationUID: ', scribbleSegmentationUID, ' || oldSegmentationUID: ', oldSegmentationUID);
        cornerstone3DTools.segmentation.activeSegmentation.setActiveSegmentationRepresentation(toolGroupId, oldSegmentationUID[0]);

    }else{
        showToast('No CT data available')
    }
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
    setRenderingEngineAndViewports(toolGroup);
    
    // -------------------------------------------------> Step 4 - Get .dcm data
    await fetchAndLoadData(2);

}


setup()



/**
TO-DO
1. Handle brush size going negative
2. Make trsnsfer function for PET
3. Make segmentation uneditable.
4. Add fgd and bgd buttons
5. Check why 'C3D - CT + RTSS' has a slightly displaced RTSS
*/