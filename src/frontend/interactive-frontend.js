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



// **************************** VARIABLES ************************************

// HTML ids
const interactionButtonsDivId = 'interactionButtonsDiv'
const axialID                 = 'ViewPortId-Axial';
const sagittalID              = 'ViewPortId-Sagittal';
const coronalID               = 'ViewPortId-Coronal';
const viewportIds             = [axialID, sagittalID, coronalID];
const otherButtonsDivId       = 'otherButtonsDiv';


// Rendering + Volume + Segmentation ids
const renderingEngineId        = 'myRenderingEngine';
const toolGroupIdContours      = 'MY_TOOL_GROUP_ID_CONTOURS';
const toolGroupIdScribble      = 'MY_TOOL_GROUP_ID_SCRIBBLE'; // not in use, failed experiment: Multiple tool groups found for renderingEngineId: myRenderingEngine and viewportId: ViewPortId-Axial. You should only have one tool group per viewport in a renderingEngine.
const volumeLoaderScheme       = 'cornerstoneStreamingImageVolume';
const volumeIdPETBase      = `${volumeLoaderScheme}:myVolumePET`; //+ cornerstone3D.utilities.uuidv4()
const volumeIdCTBase       = `${volumeLoaderScheme}:myVolumeCT`;

// Colors
const COLOR_RGB_FGD = 'rgb(218, 165, 32)' // 'goldenrod'
const COLOR_RGB_BGD = 'rgb(0, 0, 255)'    // 'blue'

const MASK_TYPE_GT   = 'GT';
const MASK_TYPE_PRED = 'PRED';

const INIT_BRUSH_SIZE = 5

const scribbleSegmentationIdBase = `SCRIBBLE_SEGMENTATION_ID`; // this should not change for different scribbles

let scribbleSegmentationId;

const SEG_TYPE_LABELMAP = 'LABELMAP'

// Tools
const MODE_ACTIVE  = 'Active';

// General
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

await makeGUIElementsHelper.createContouringHTML();

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
        config.setPatientIdx(parseInt(this.value));
        await fetchAndLoadData(config.patientIdx);
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

/****************************************************************
*                             UTILS  
*****************************************************************/

let orthancHeaders = new Headers();
orthancHeaders.set('Authorization', 'Basic ' + btoa('orthanc'+ ":" + 'orthanc'));



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
            makeGUIElementsHelper.setButtonBoundaryColor(thisButton, false);
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
            makeGUIElementsHelper.setButtonBoundaryColor(thisButton, true);
        }
    }else{
        updateGUIElementsHelper.showToast('No PET data available')
    }
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

function setAllContouringToolsPassive() {

    const toolGroupContours         = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupIdContours);
    // const toolGroupScribble         = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupIdScribble);
    const windowLevelTool           = cornerstone3DTools.WindowLevelTool;
    // const planarFreehandROITool2     = cornerstone3DTools.PlanarFreehandROITool; // some issue -- Cannot access '__WEBPACK_DEFAULT_EXPORT__' before initialization

    toolGroupContours.setToolPassive(windowLevelTool.toolName);
    if (config.MODALITY_CONTOURS === config.MODALITY_SEG){
        toolGroupContours.setToolPassive(config.strBrushCircle);
        toolGroupContours.setToolPassive(config.strEraserCircle);
    } else if (config.MODALITY_CONTOURS === config.MODALITY_RTSTRUCT){
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
    if (config.MODALITY_CONTOURS == config.MODALITY_SEG)
        cornerstone3DTools.addTool(brushTool);
    else if (config.MODALITY_CONTOURS == MODALITY_RTSTRUCT){
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

    if (config.MODALITY_CONTOURS == config.MODALITY_SEG){
        toolGroupContours.addTool(brushTool.toolName);
        toolGroupContours.addToolInstance(config.strBrushCircle, brushTool.toolName, { activeStrategy: 'FILL_INSIDE_CIRCLE', brushSize:INIT_BRUSH_SIZE}) ;
        toolGroupContours.addToolInstance(config.strEraserCircle, brushTool.toolName, { activeStrategy: 'ERASE_INSIDE_CIRCLE', brushSize:INIT_BRUSH_SIZE});
    }
    else if (config.MODALITY_CONTOURS == config.MODALITY_RTSTRUCT){
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
    if (config.MODALITY_CONTOURS == config.MODALITY_SEG){
        // toolGroupContours.setToolPassive(brushTool.toolName);
        toolGroupContours.setToolPassive(config.strBrushCircle); // , { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });
        toolGroupContours.setToolPassive(config.strEraserCircle); // , { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });
    } else if (config.MODALITY_CONTOURS == config.MODALITY_RTSTRUCT){
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
        if (config.MODALITY_CONTOURS == config.MODALITY_SEG){
            const toolGroupContours = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupIdContours);
            if (toolGroupContours.toolOptions[config.strBrushCircle].mode === MODE_ACTIVE || toolGroupContours.toolOptions[config.strEraserCircle].mode === MODE_ACTIVE){
                const segUtils       = cornerstone3DTools.utilities.segmentation;
                let initialBrushSize = segUtils.getBrushSizeForToolGroup(toolGroupIdContours);
                if (event.key === '+')
                    segUtils.setBrushSizeForToolGroup(toolGroupIdContours, initialBrushSize + 1);
                else if (event.key === '-'){
                    if (initialBrushSize > 1)
                        segUtils.setBrushSizeForToolGroup(toolGroupIdContours, initialBrushSize - 1);
                }
                let newBrushSize = segUtils.getBrushSizeForToolGroup(toolGroupIdContours);
                updateGUIElementsHelper.showToast(`Brush size: ${newBrushSize}`);
            }
        }

        else if (event.key == 'p'){
            await showPET();
            await setSliceIdxForViewPortFromGlobalSliceIdxVars(false);
        }

    });
    
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
        [config.windowLevelButton , config.contourSegmentationToolButton, config.sculptorToolButton, config.editBaseContourViaScribbleButton, showPETButton].forEach((buttonHTML) => {
            if (buttonHTML === null) return;
            makeGUIElementsHelper.setButtonBoundaryColor(buttonHTML, false);
            buttonHTML.disabled = true;
        });

        // Other GUI
        apiEndpointHelpers.setServerStatus(0);
        
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
            apiEndpointHelpers.makeRequestToPrepare(patientIdx)

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
                    config.setScribbleSegmentationUIDs(segReprUIDs);
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
                [config.windowLevelButton , config.contourSegmentationToolButton, config.sculptorToolButton, config.editBaseContourViaScribbleButton, showPETButton].forEach((buttonHTML) => {
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
    
    // -------------------------------------------------> Step 1 - Cornestone3D Init
    await cornerstoneInit();
    
    // // -------------------------------------------------> Step 2 - Do tooling stuff
    await getToolsAndToolGroup();    

    // // -------------------------------------------------> Step 3 - Make rendering engine
    setRenderingEngineAndViewports();
    
    // // -------------------------------------------------> Step 4 - Get .dcm data
    await makeGUIElementsHelper.waitForCredentials(); // For the first time
    await fetchAndLoadData(patientIdx);
    makeGUIElementsHelper.setContouringButtonsLogic();
    keyboardEventsHelper.setMouseAndKeyboardEvents();

}

// Some debug params
if (1){
    // config.setPatientIdx(13); // CHMR005 (wont follow instruction)
    // config.setPatientIdx(13); // CHMR016
    // config.setPatientIdx(16);  // CHMR023 (problematic. No more)
    // config.setPatientIdx(22); // CHMR034 (no major issues)
    config.setPatientIdx(21); // CHMR030 (many edits to make!)
    // config.setPatientIdx(23); // CHMR040 (1 edit to make in coronal)
    config.setModalityContours(config.MODALITY_SEG);
}


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