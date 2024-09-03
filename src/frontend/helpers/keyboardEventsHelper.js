import * as config from './config.js';
import * as updateGUIElementsHelper from './updateGUIElementsHelper.js';
import * as cornerstoneHelpers from './cornerstoneHelpers.js';
import * as annotationHelpers from './annotationHelpers.js';
import * as apiEndpointHelpers from './apiEndpointHelpers.js';

import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstone3DTools from '@cornerstonejs/tools';



// ******************************* Contour handling ********************************************
function showUnshowAllSegmentations() {
    const toolGroupContours = cornerstone3DTools.ToolGroupManager.getToolGroup(config.toolGroupIdContours);
    const segmentationDisplayTool = cornerstone3DTools.SegmentationDisplayTool;

    if (toolGroupContours.toolOptions[segmentationDisplayTool.toolName].mode === config.MODE_ENABLED){
        toolGroupContours.setToolDisabled(segmentationDisplayTool.toolName);
    } else {
        toolGroupContours.setToolEnabled(segmentationDisplayTool.toolName);
    }
}


// ******************************* 3D World Position Handling ********************************************
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

// ******************************* MAIN FUNCTION ********************************************
function setMouseAndKeyboardEvents(){

    // Step 1 - handle scroll event
    document.addEventListener('wheel', function(evt) {
        if (evt.target.className == 'cornerstone-canvas') {
            // NOTE: Here we only change the slideIdxHTML, not the sliceIdxViewportReference
            const divObj = evt.target.offsetParent.parentElement
            const {viewport: activeViewport, viewportId: activeViewportId} = cornerstone3D.getEnabledElement(divObj);
            const imageIdxHTMLForViewport = activeViewport.getCurrentImageIdIndex()
            const totalImagesForViewPort  = activeViewport.getNumberOfSlices()
            updateGUIElementsHelper.setSliceIdxHTMLForViewPort(activeViewportId, imageIdxHTMLForViewport, totalImagesForViewPort)
            updateGUIElementsHelper.setGlobalSliceIdxViewPortReferenceVars()
        }
    });

    // Step 2 - handle left-arrow and right-arrow keydown event
    document.addEventListener('keydown', async function(evt) {
        
        // For slice traversal
        if (config.viewPortIdsAll.includes(evt.target.id)){
            if (evt.key == config.SHORTCUT_KEY_ARROW_LEFT || evt.key == config.SHORTCUT_KEY_ARROW_RIGHT){

                try {

                    // Step 1 - Init
                    const {viewport: activeViewport, viewportId: activeViewportId} = cornerstone3D.getEnabledElement(evt.target);
                    const sliceIdxHTMLForViewport = activeViewport.getCurrentImageIdIndex()
                    const totalImagesForViewPort  = activeViewport.getNumberOfSlices()
                    let viewportViewReference     = activeViewport.getViewReference()
                    
                    // Step 2 - Handle keydown event 
                    // Step 2.1 - Update sliceIdxHTMLForViewport
                    let newSliceIdxHTMLForViewport;
                    if (evt.key == config.SHORTCUT_KEY_ARROW_LEFT){
                        newSliceIdxHTMLForViewport = sliceIdxHTMLForViewport - 1;
                    } else if (evt.key == config.SHORTCUT_KEY_ARROW_RIGHT){
                        newSliceIdxHTMLForViewport = sliceIdxHTMLForViewport + 1;
                    }
                    if (newSliceIdxHTMLForViewport < 0) newSliceIdxHTMLForViewport = 0;
                    if (newSliceIdxHTMLForViewport > totalImagesForViewPort-1) newSliceIdxHTMLForViewport = totalImagesForViewPort - 1;
                    updateGUIElementsHelper.setSliceIdxHTMLForViewPort(activeViewportId, newSliceIdxHTMLForViewport, totalImagesForViewPort)

                    // Step 2.2 - Update the viewport itself
                    const newSliceIdxViewPortReference = convertSliceIdxHTMLToSliceIdxViewportReference(newSliceIdxHTMLForViewport, activeViewportId, totalImagesForViewPort)
                    viewportViewReference.sliceIndex = newSliceIdxViewPortReference;
                    await activeViewport.setViewReference(viewportViewReference);
                    cornerstoneHelpers.renderNow();

                } catch (error){
                    console.error('   -- [keydown] Error: ', error);
                }
            }
        }

        // For show/unshow contours
        if (evt.key === config.SHORTCUT_KEY_C) {
            showUnshowAllSegmentations()
        }

        // Update sliceIdx vars
        updateGUIElementsHelper.setGlobalSliceIdxViewPortReferenceVars()

    });

    // Step 3 - handle 'r' keydown event
    window.addEventListener('keydown', async function(event) {
        if (event.key === 'r'){
            cornerstoneHelpers.resetView();
            updateGUIElementsHelper.setSliceIdxHTMLForAllHTML()
        }
    });

    // Step 4 - Add event listeners for mouseup event
    const toolGroupContours         = cornerstone3DTools.ToolGroupManager.getToolGroup(config.toolGroupIdContours);
    config.viewPortIdsAll.forEach((viewportId, index) => {
        const viewportDiv = document.getElementById(viewportId);
        
        // Step 4.1 - Mouseup event
        viewportDiv.addEventListener('mouseup', function() {
            setTimeout(async () => {

                // const freehandRoiToolMode = toolGroupContours.toolOptions[planarFreehandROITool.toolName].mode;
                const freehandRoiToolMode = toolGroupContours.toolOptions[cornerstone3DTools.PlanarFreehandROITool.toolName].mode;
                if (freehandRoiToolMode === config.MODE_ACTIVE){
                    const scribbleAnnotations = annotationHelpers.getAllPlanFreeHandRoiAnnotations()
                    if (scribbleAnnotations.length > 0){
                        const scribbleAnnotationUID = scribbleAnnotations[scribbleAnnotations.length - 1].annotationUID;
                        if (scribbleAnnotations.length > 0){
                            const polyline           = scribbleAnnotations[0].data.contour.polyline;
                            const points3D = polyline.map(function(point) {
                                return getIndex(cornerstone3D.cache.getVolume(config.volumeIdCT), point);
                            });
                            // console.log(' - [setContouringButtonsLogic()] points3D: ', points3D);
                            const points3DInt = points3D.map(x => x.map(y => Math.abs(Math.round(y))));
                            await apiEndpointHelpers.makeRequestToProcess(points3DInt, scribbleAnnotationUID);
                        }
                    } else {
                        console.log(' - [setContouringButtonsLogic()] scribbleAnnotations: ', scribbleAnnotations);
                        cornerstoneHelpers.renderNow();
                    }
                } else {
                    console.log('   -- [setContouringButtonsLogic()] freehandRoiToolMode: ', freehandRoiToolMode);
                    updateGUIElementsHelper.showToast('Please enable the AI-scribble button to draw contours');
                }
            }, 100);
        });
        
        // Step 4.2 - Mousemove event
        viewportDiv.addEventListener('mousemove', function(evt) {
            if (config.volumeIdCT != undefined){
                const volumeCTThis = cornerstone3D.cache.getVolume(config.volumeIdCT);
                if (volumeCTThis != undefined){
                    const renderingEngine = cornerstone3D.getRenderingEngine(config.renderingEngineId);
                    const rect            = viewportDiv.getBoundingClientRect();
                    const canvasPos       = [Math.floor(evt.clientX - rect.left),Math.floor(evt.clientY - rect.top),];
                    const viewPortTmp     = renderingEngine.getViewport(config.viewPortIdsAll[index]);
                    const worldPos        = viewPortTmp.canvasToWorld(canvasPos);
                    let index3D           = getIndex(volumeCTThis, worldPos) //.forEach((val) => Math.round(val));
                    if (canvasPos != undefined && index3D != undefined && worldPos != undefined){
                        index3D                        = index3D.map((val) => Math.round(val));
                        config.canvasPosHTML.innerText = `Canvas position: (${config.viewPortIdsAll[index]}) \n ==> (${canvasPos[0]}, ${canvasPos[1]}) || (${index3D[0]}, ${index3D[1]}, ${index3D[2]})`;
                        config.ctValueHTML.innerText   = `CT value: ${getValue(volumeCTThis, worldPos)}`;
                        if (config.volumeIdPET != undefined){
                            const volumePTThis            = cornerstone3D.cache.getVolume(config.volumeIdPET);
                            config.ptValueHTML.innerText = `PT value: ${getValue(volumePTThis, worldPos)}`;
                        }
                    }else{
                        updateGUIElementsHelper.showToast('Mousemove Event: Error in getting canvasPos, index3D, worldPos')
                    }                    
                    
                }
            }
        });
    })

}

export {setMouseAndKeyboardEvents};