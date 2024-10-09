import * as config from './config.js';
import * as makeGUIElementsHelper from './makeGUIElementsHelper.js';
import * as updateGUIElementsHelper from './updateGUIElementsHelper.js';
import * as cornerstoneHelpers from './cornerstoneHelpers.js';
import * as annotationHelpers from './annotationHelpers.js';
import * as apiEndpointHelpers from './apiEndpointHelpers.js';
import * as segmentationHelpers from './segmentationHelpers.js';

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
        if (config.userCredRole === config.USERROLE_EXPERT){
            segmentationHelpers.setSegmentationIndexOpacity(config.toolGroupIdContours, config.gtSegmentationUIDs[0], 1, 0);
        }
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

// ******************************* CONTOURING TOOLS ********************************************
function getAllContouringToolsPassiveStatus(){
    
    // Step 0 - Init
    const toolGroupContours = cornerstone3DTools.ToolGroupManager.getToolGroup(config.toolGroupIdContours);
    let allToolsStatus = false;

    // Step 1 - Brush tool
    let brushToolMode = false;
    if (config.MODALITY_CONTOURS == config.MODALITY_SEG){
        brushToolMode = toolGroupContours.toolOptions[config.strBrushCircle].mode
    } else if (config.MODALITY_CONTOURS == config.MODALITY_RTSTRUCT){
        const planarFreeHandContourToolMode = toolGroupContours.toolOptions[cornerstone3DTools.PlanarFreehandROITool.toolName].mode;
        brushToolMode = planarFreeHandContourToolMode;
    }

    // Step 2 - Eraser tool
    let eraserToolMode = false;
    if (config.MODALITY_CONTOURS == config.MODALITY_SEG){
        eraserToolMode = toolGroupContours.toolOptions[config.strEraserCircle].mode
    } else if (config.MODALITY_CONTOURS == config.MODALITY_RTSTRUCT){
        eraserToolMode = toolGroupContours.toolOptions[cornerstone3DTools.SculptorTool.toolName].mode;
    }

    // Step 3 - Window level tool
    let windowLevelToolMode = toolGroupContours.toolOptions[cornerstone3DTools.WindowLevelTool.toolName].mode;

    // Step 4 - AI Interactive tool
    let aiInteractiveToolMode = toolGroupContours.toolOptions[cornerstone3DTools.PlanarFreehandROITool.toolName].mode;

    allToolsStatus = brushToolMode === config.MODE_PASSIVE && eraserToolMode === config.MODE_PASSIVE && windowLevelToolMode === config.MODE_PASSIVE && aiInteractiveToolMode === config.MODE_PASSIVE;
    return allToolsStatus;
}

// ******************************* DIV TOOLS ********************************************
function getOtherDivs(htmlElement){

    // Step 0 - Init
    let otherHTMLElements = [];
    
    // Step 1.1 - For CT divs
    if (htmlElement.id == config.axialID){
        otherHTMLElements = [config.sagittalDiv, config.coronalDiv];
    } else if (htmlElement.id == config.sagittalID){
        otherHTMLElements = [config.axialDiv, config.coronalDiv];
    } else if (htmlElement.id == config.coronalID){
        otherHTMLElements = [config.axialDiv, config.sagittalDiv];
    }

    // Step 1.2 - For PET divs
    else if (htmlElement.id == config.axialPTID){
        otherHTMLElements = [config.sagittalDivPT, config.coronalDivPT];
    } else if (htmlElement.id == config.sagittalPTID){
        otherHTMLElements = [config.axialDivPT, config.coronalDivPT];
    } else if (htmlElement.id == config.coronalPTID){
        otherHTMLElements = [config.axialDivPT, config.sagittalDivPT];
    }

    return otherHTMLElements
}

function getHoveredPointIn3D(volumeId, htmlOfElement, evt) {
    
    // Step 0 - Init
    let index3D = undefined;
    const volume = cornerstone3D.cache.getVolume(volumeId);
    if (!volume) {
        return index3D;
    }

    // Step 1 - Get viewport
    const viewportOfElement = cornerstone3D.getEnabledElement(htmlOfElement).viewport; 

    // Step 1 - Get the canvas/world and final index3D position
    const rect      = htmlOfElement.getBoundingClientRect();
    const canvasPos = [Math.floor(evt.clientX - rect.left), Math.floor(evt.clientY - rect.top)];
    const worldPos  = viewportOfElement.canvasToWorld(canvasPos);
    index3D         = getIndex(volume, worldPos);
    
    // Step 2 - Round the index3D values
    if (index3D[0] != NaN || index3D[0] != 'NaN')
        index3D = index3D.map((val) => Math.round(val));
    else
        console.log('   -- [getHoveredPointIn3D()] index3D[0] is NaN: '. rect, canvasPos, worldPos);

    return index3D;
}

function getViewTypeFromDiv(htmlElement){
    let viewType = undefined;

    if (htmlElement.id == config.axialID || htmlElement.id == config.axialPTID)
        viewType = config.KEY_AXIAL;
    else if (htmlElement.id == config.sagittalID || htmlElement.id == config.sagittalPTID)
        viewType = config.KEY_SAGITTAL;
    else if (htmlElement.id == config.coronalID || htmlElement.id == config.coronalPTID)
        viewType = config.KEY_CORONAL;

    return viewType

}

// ******************************* MAIN FUNCTION ********************************************
function setMouseAndKeyboardEvents(){

    // Step 1 - Handle keydown events
    window.addEventListener('keydown', async function(event) {

        // Contour-related: For show/unshow contours
        if (event.key === config.SHORTCUT_KEY_C) {
            showUnshowAllSegmentations()
        }
        
        // Viewport-related: For reset view
        if (event.key === config.SHORTCUT_KEY_R){
            cornerstoneHelpers.resetView();
            updateGUIElementsHelper.setSliceIdxHTMLForAllHTML()
            updateGUIElementsHelper.setGlobalSliceIdxViewPortReferenceVars()
        }

        // Viewport-related: For slice traversal
        if (event.key == config.SHORTCUT_KEY_ARROW_LEFT || event.key == config.SHORTCUT_KEY_ARROW_RIGHT){

            try {

                if (config.viewPortIdsAll.includes(event.target.id)){
                    // Step 1 - Init
                    const {viewport: activeViewport, viewportId: activeViewportId} = cornerstone3D.getEnabledElement(event.target);
                    const sliceIdxHTMLForViewport = activeViewport.getCurrentImageIdIndex()
                    const totalImagesForViewPort  = activeViewport.getNumberOfSlices()
                    let viewportViewReference     = activeViewport.getViewReference()
                    
                    // Step 2 - Handle keydown event 
                    // Step 2.1 - Update sliceIdxHTMLForViewport
                    let newSliceIdxHTMLForViewport;
                    if (event.key == config.SHORTCUT_KEY_ARROW_LEFT){
                        newSliceIdxHTMLForViewport = sliceIdxHTMLForViewport - 1;
                    } else if (event.key == config.SHORTCUT_KEY_ARROW_RIGHT){
                        newSliceIdxHTMLForViewport = sliceIdxHTMLForViewport + 1;
                    }
                    if (newSliceIdxHTMLForViewport < 0) newSliceIdxHTMLForViewport = 0;
                    if (newSliceIdxHTMLForViewport > totalImagesForViewPort-1) newSliceIdxHTMLForViewport = totalImagesForViewPort - 1;
                    updateGUIElementsHelper.setSliceIdxHTMLForViewPort(activeViewportId, newSliceIdxHTMLForViewport, totalImagesForViewPort)

                    // Step 2.2 - Update the viewport itself
                    const newSliceIdxViewPortReference = updateGUIElementsHelper.convertSliceIdxHTMLToSliceIdxViewportReference(newSliceIdxHTMLForViewport, activeViewportId, totalImagesForViewPort)
                    viewportViewReference.sliceIndex = newSliceIdxViewPortReference;
                    await activeViewport.setViewReference(viewportViewReference);
                    cornerstoneHelpers.renderNow();

                    // Update sliceIdx vars
                    updateGUIElementsHelper.setGlobalSliceIdxViewPortReferenceVars()
                }

            } catch (error){
                console.error('   -- [keydown] Error: ', error);
            }
        }

        // Tool-related: For AI interactive tool
        if (event.key === config.SHORTCUT_KEY_F){
            makeGUIElementsHelper.eventTriggerForFgdBgdCheckbox(config.fgdCheckboxId);
            config.editBaseContourViaScribbleButton.click();
        }
        
        // Tool-related: For AI interactive tool
        if (event.key === config.SHORTCUT_KEY_B){
            makeGUIElementsHelper.eventTriggerForFgdBgdCheckbox(config.bgdCheckboxId);
            config.editBaseContourViaScribbleButton.click();
        }

        // Tool-related: For disabling all tools
        if (event.key === config.SHORTCUT_KEY_ESC){

            // Step 0 - Init
            makeGUIElementsHelper.changeCursorToDefault();

            // Set all buttons to false
            [config.windowLevelButton , config.contourSegmentationToolButton, config.sculptorToolButton, config.editBaseContourViaScribbleButton].forEach((buttonHTML, buttonId) => {
                
                // Step 1 - Change HTML
                buttonHTML.checked = false;
                makeGUIElementsHelper.setButtonBoundaryColor(buttonHTML, false);

                // Step 2 - Disable cornerstone3D tools
                const toolGroupContours         = cornerstone3DTools.ToolGroupManager.getToolGroup(config.toolGroupIdContours);
                // const toolGroupScribble         = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupIdScribble);
                const windowLevelTool           = cornerstone3DTools.WindowLevelTool;
                const planarFreeHandContourTool = cornerstone3DTools.PlanarFreehandContourSegmentationTool;
                const sculptorTool              = cornerstone3DTools.SculptorTool;
                const planarFreehandROITool     = cornerstone3DTools.PlanarFreehandROITool;
                toolGroupContours.setToolPassive(windowLevelTool.toolName);          
                if (config.MODALITY_CONTOURS == config.MODALITY_SEG){
                    toolGroupContours.setToolPassive(config.strBrushCircle);
                    toolGroupContours.setToolPassive(config.strEraserCircle);
                } else if (config.MODALITY_CONTOURS == config.MODALITY_RTSTRUCT){
                    toolGroupContours.setToolPassive(planarFreeHandContourTool.toolName);
                    toolGroupContours.setToolPassive(sculptorTool.toolName);
                }
                toolGroupContours.setToolPassive(planarFreehandROITool.toolName);  

                // Remove any scribbles
                const scribbleAnnotations = annotationHelpers.getAllPlanFreeHandRoiAnnotations()
                if (scribbleAnnotations.length > 0){
                    const scribbleAnnotationUID = scribbleAnnotations[scribbleAnnotations.length - 1].annotationUID;
                    annotationHelpers.handleStuffAfterProcessEndpoint(scribbleAnnotationUID);
                }
            });
        }
        
        // Tool-related: For changing brush size
        if (event.key === config.SHORTCUT_KEY_PLUS || event.key === config.SHORTCUT_KEY_MINUS){
            if (config.MODALITY_CONTOURS == config.MODALITY_SEG){
                const toolGroupContours = cornerstone3DTools.ToolGroupManager.getToolGroup(config.toolGroupIdContours);
                if (toolGroupContours.toolOptions[config.strBrushCircle].mode === config.MODE_ACTIVE || toolGroupContours.toolOptions[config.strEraserCircle].mode === config.MODE_ACTIVE){
                    const segUtils       = cornerstone3DTools.utilities.segmentation;
                    const toolName       = toolGroupContours.toolOptions[config.strBrushCircle].mode === config.MODE_ACTIVE ? config.strBrushCircle : config.strEraserCircle;
                    let initialBrushSize = segUtils.getBrushSizeForToolGroup(config.toolGroupIdContours, toolName);
                    if (event.key === '+')
                        segUtils.setBrushSizeForToolGroup(config.toolGroupIdContours, initialBrushSize + 1);
                    else if (event.key === '-'){
                        if (initialBrushSize > 1)
                            segUtils.setBrushSizeForToolGroup(config.toolGroupIdContours, initialBrushSize - 1);
                    }
                    let newBrushSize = segUtils.getBrushSizeForToolGroup(config.toolGroupIdContours);
                    updateGUIElementsHelper.showToast(`Brush size: ${newBrushSize}`);
                }
            }    
        }

    });

    // Step 2 - Handle mouse events
    const toolGroupContours = cornerstone3DTools.ToolGroupManager.getToolGroup(config.toolGroupIdContours);
    config.viewPortDivsAll.forEach((viewportDiv, index) => {
        
        // Step 2.1 - Wheel event
        viewportDiv.addEventListener(config.MOUSE_EVENT_WHEEL, function(evt) {
            const {viewport: activeViewport, viewportId: activeViewportId} = cornerstone3D.getEnabledElement(viewportDiv);
            const imageIdxHTMLForViewport = activeViewport.getCurrentImageIdIndex()
            const totalImagesForViewPort  = activeViewport.getNumberOfSlices()
            updateGUIElementsHelper.setSliceIdxHTMLForViewPort(activeViewportId, imageIdxHTMLForViewport, totalImagesForViewPort)
            updateGUIElementsHelper.setGlobalSliceIdxViewPortReferenceVars()
        });

        // Step 2.2 - Mouseup event
        viewportDiv.addEventListener(config.MOUSE_EVENT_MOUSEUP, function(evt) {
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
                            await updateGUIElementsHelper.takeSnapshots([config.viewportDivId]);
                            await apiEndpointHelpers.makeRequestToProcess(points3DInt, getViewTypeFromDiv(viewportDiv), scribbleAnnotationUID);
                        }
                    } else {
                        console.log(' - [setMouseAndKeyboardEvents()] scribbleAnnotations: ', scribbleAnnotations);
                        cornerstoneHelpers.renderNow();
                    }
                } else if (getAllContouringToolsPassiveStatus()) {
                    // console.log('   -- [setContouringButtonsLogic()] freehandRoiToolMode: ', freehandRoiToolMode);
                    updateGUIElementsHelper.showToast('Please enable the AI-scribble button to draw contours');
                }
            }, 100);
        });

        // Step 2.3 - Mousemove event
        viewportDiv.addEventListener(config.MOUSE_EVENT_MOUSEMOVE, function(evt) {
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

        // Step 2.4 - Mousedrag event
        viewportDiv.addEventListener(cornerstone3DTools.Enums.Events.MOUSE_DRAG, function(evt) {
            const windowLevelToolMode = toolGroupContours.toolOptions[cornerstone3DTools.WindowLevelTool.toolName].mode;
            if (windowLevelToolMode === config.MODE_ACTIVE){
                const htmlElement = evt.detail.element;
                const newVoiRange = cornerstone3D.getEnabledElement(htmlElement).viewport.getProperties().voiRange;

                getOtherDivs(htmlElement).forEach((element) => {
                    cornerstone3D.getEnabledElement(element).viewport.setProperties({ voiRange: newVoiRange });
                });
            }
        });

        // Step 2.5 - Mouseclick event
        viewportDiv.addEventListener(config.MOUSE_EVENT_CLICK, function(evt) {
            const freehandRoiToolMode = toolGroupContours.toolOptions[cornerstone3DTools.PlanarFreehandROITool.toolName].mode;
            if (freehandRoiToolMode === config.MODE_ACTIVE){
                const scribbleAnnotations = annotationHelpers.getAllPlanFreeHandRoiAnnotations()
                if (scribbleAnnotations.length == 0){
                    const points3DInt = getHoveredPointIn3D(config.volumeIdCT, viewportDiv, evt);
                    console.log('   -- [setMouseAndKeyboardEvents(evt=click)] points3DInt: ', points3DInt);
                    (function() {
                        (async () => {
                            await updateGUIElementsHelper.takeSnapshots([config.viewportDivId]);
                            await apiEndpointHelpers.makeRequestToProcess([points3DInt], getViewTypeFromDiv(viewportDiv), []);
                        })();
                    })();
                    
            
                }
            }
        });

    });

}

export {setMouseAndKeyboardEvents};