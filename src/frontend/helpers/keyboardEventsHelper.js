import * as config from './config.js';
import * as updateGUIElementsHelper from './updateGUIElementsHelper.js';
import * as cornerstoneHelpers from './cornerstoneHelpers.js';
import * as cornerstone3D from '@cornerstonejs/core';


// ******************************* SliceIdx handling ********************************************

function setGlobalSliceIdxViewPortReferenceVars(verbose=false){

    // Step 0 - Init
    // let axialDiv = config.getAxialDiv(), sagittalDiv = config.getSagittalDiv(), coronalDiv = config.getCoronalDiv()
    let axialDivPT = config.getAxialDivPT(), sagittalDivPT = config.getSagittalDivPT(), coronalDivPT = config.getCoronalDivPT()

    // Step 1 - Get relevant variables
    const {viewport: axialViewport, viewportId: axialViewportId}       = cornerstone3D.getEnabledElement(config.axialDiv);
    const {viewport: sagittalViewport, viewportId: sagittalViewportId} = cornerstone3D.getEnabledElement(config.sagittalDiv);
    const {viewport: coronalViewport, viewportId: coronalViewportId}   = cornerstone3D.getEnabledElement(config.coronalDiv);
    const {viewport: axialViewportPT, viewportId: axialViewportPTId}   = cornerstone3D.getEnabledElement(axialDivPT);
    const {viewport: sagittalViewportPT, viewportId: sagittalViewportPTId} = cornerstone3D.getEnabledElement(sagittalDivPT);
    const {viewport: coronalViewportPT, viewportId: coronalViewportPTId}   = cornerstone3D.getEnabledElement(coronalDivPT);

    // Step 2 - Set global variables
    config.globalSliceIdxVars.axialSliceIdxHTML              = axialViewport.getCurrentImageIdIndex()
    config.globalSliceIdxVars.axialSliceIdxViewportReference = convertSliceIdxHTMLToSliceIdxViewportReference(config.globalSliceIdxVars.axialSliceIdxHTML, axialViewportId, axialViewport.getNumberOfSlices())
    config.globalSliceIdxVars.axialViewPortReference         = axialViewport.getViewReference()
    config.globalSliceIdxVars.axialCamera                    = axialViewport.getCamera()
    
    config.globalSliceIdxVars.sagittalSliceIdxHTML              = sagittalViewport.getCurrentImageIdIndex()
    config.globalSliceIdxVars.sagittalSliceIdxViewportReference = convertSliceIdxHTMLToSliceIdxViewportReference(config.globalSliceIdxVars.sagittalSliceIdxHTML, sagittalViewportId, sagittalViewport.getNumberOfSlices())
    config.globalSliceIdxVars.sagittalViewportReference         = sagittalViewport.getViewReference()
    config.globalSliceIdxVars.sagittalCamera                    = sagittalViewport.getCamera()

    config.globalSliceIdxVars.coronalSliceIdxHTML              = coronalViewport.getCurrentImageIdIndex()
    config.globalSliceIdxVars.coronalSliceIdxViewportReference = convertSliceIdxHTMLToSliceIdxViewportReference(config.globalSliceIdxVars.coronalSliceIdxHTML, coronalViewportId, coronalViewport.getNumberOfSlices())
    config.globalSliceIdxVars.coronalViewport                  = coronalViewport.getViewReference()
    config.globalSliceIdxVars.coronalCamera                    = coronalViewport.getCamera()

    config.globalSliceIdxVars.axialSliceIdxHTMLPT              = axialViewportPT.getCurrentImageIdIndex()
    config.globalSliceIdxVars.axialSliceIdxViewportReferencePT = convertSliceIdxHTMLToSliceIdxViewportReference(config.globalSliceIdxVars.axialSliceIdxHTMLPT, axialViewportPTId, axialViewportPT.getNumberOfSlices())
    config.globalSliceIdxVars.axialViewPortReferencePT         = axialViewportPT.getViewReference()
    config.globalSliceIdxVars.axialCameraPT                    = axialViewportPT.getCamera()

    config.globalSliceIdxVars.sagittalSliceIdxHTMLPT              = sagittalViewportPT.getCurrentImageIdIndex()
    config.globalSliceIdxVars.sagittalSliceIdxViewportReferencePT = convertSliceIdxHTMLToSliceIdxViewportReference(config.globalSliceIdxVars.sagittalSliceIdxHTMLPT, sagittalViewportPTId, sagittalViewportPT.getNumberOfSlices())
    config.globalSliceIdxVars.sagittalViewportReferencePT         = sagittalViewportPT.getViewReference()
    config.globalSliceIdxVars.sagittalCameraPT                    = sagittalViewportPT.getCamera()

    config.globalSliceIdxVars.coronalSliceIdxHTMLPT              = coronalViewportPT.getCurrentImageIdIndex()
    config.globalSliceIdxVars.coronalSliceIdxViewportReferencePT = convertSliceIdxHTMLToSliceIdxViewportReference(config.globalSliceIdxVars.coronalSliceIdxHTMLPT, coronalViewportPTId, coronalViewportPT.getNumberOfSlices())
    config.globalSliceIdxVars.coronalViewportReferencePT         = coronalViewportPT.getViewReference()
    config.globalSliceIdxVars.coronalCameraPT                    = coronalViewportPT.getCamera()
    
    if (verbose)
        console.log(' - [setGlobalSliceIdxVars()] Setting globalSliceIdxVars:', config.globalSliceIdxVars)
}

function convertSliceIdxHTMLToSliceIdxViewportReference(sliceIdxHTML, viewportId, totalImagesForViewPort){
    
    let sliceIdxViewportReference;
    
    if (viewportId == config.sagittalID){
        sliceIdxViewportReference = sliceIdxHTML
    } else if (viewportId == config.coronalID || viewportId == config.axialID){
       sliceIdxViewportReference = (totalImagesForViewPort-1) - (sliceIdxHTML);
    }
    return sliceIdxViewportReference
}

async function setSliceIdxForViewPortFromGlobalSliceIdxVars(verbose=false){

    const {viewport: axialViewport, viewportId: axialViewportId}       = cornerstone3D.getEnabledElement(axialDiv);
    const {viewport: sagittalViewport, viewportId: sagittalViewportId} = cornerstone3D.getEnabledElement(sagittalDiv);
    const {viewport: coronalViewport, viewportId: coronalViewportId}   = cornerstone3D.getEnabledElement(coronalDiv);

    if (verbose)
        console.log(' - [setSliceIdxForViewPortFromGlobalSliceIdxVars()] Setting sliceIdx for viewport:', globalSliceIdxVars)   

    if (true){
        let axialViewportViewReference  = globalSliceIdxVars.axialViewPortReference
        await axialViewport.setViewReference(axialViewportViewReference)
        await axialViewport.setCamera(globalSliceIdxVars.axialCamera)

        let sagittalViewportViewReference = globalSliceIdxVars.sagittalViewportReference
        await sagittalViewport.setViewReference(sagittalViewportViewReference)
        await sagittalViewport.setCamera(globalSliceIdxVars.sagittalCamera)

        let coronalViewportViewReference = globalSliceIdxVars.coronalViewportReference
        await coronalViewport.setViewReference(coronalViewportViewReference)
        await coronalViewport.setCamera(globalSliceIdxVars.coronalCamera)

    } else if (false) {
        let axialViewportViewReference = axialViewport.getViewReference()
        axialViewportViewReference.sliceIndex = globalSliceIdxVars.axialSliceIdxViewportReference
        await axialViewport.setViewReference(axialViewportViewReference)

        let sagittalViewportViewReference = sagittalViewport.getViewReference()
        sagittalViewportViewReference.sliceIndex = globalSliceIdxVars.sagittalSliceIdxViewportReference
        await sagittalViewport.setViewReference(sagittalViewportViewReference)

        let coronalViewportViewReference  = coronalViewport.getViewReference()
        coronalViewportViewReference.sliceIndex = globalSliceIdxVars.coronalSliceIdxViewportReference
        await coronalViewport.setViewReference(coronalViewportViewReference)

    }

    await renderNow()

    if (verbose){
        setGlobalSliceIdxViewPortReferenceVars()
        console.log(' - [setSliceIdxForViewPortFromGlobalSliceIdxVars()] Actual setting for viewport:', globalSliceIdxVars)
    }

}

// ******************************* MAIN FUNCTION ********************************************
function setMouseAndKeyboardEvents(){

    // handle scroll event
    document.addEventListener('wheel', function(evt) {
        if (evt.target.className == 'cornerstone-canvas') {
            // NOTE: Here we only change the slideIdxHTML, not the sliceIdxViewportReference
            const divObj = evt.target.offsetParent.parentElement
            const {viewport: activeViewport, viewportId: activeViewportId} = cornerstone3D.getEnabledElement(divObj);
            const imageIdxHTMLForViewport = activeViewport.getCurrentImageIdIndex()
            const totalImagesForViewPort  = activeViewport.getNumberOfSlices()
            updateGUIElementsHelper.setSliceIdxHTMLForViewPort(activeViewportId, imageIdxHTMLForViewport, totalImagesForViewPort)
            setGlobalSliceIdxViewPortReferenceVars()
        }
    });

    // handle left-arrow and right-arrow keydown event
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
        setGlobalSliceIdxViewPortReferenceVars()

    });

    window.addEventListener('keydown', async function(event) {
        if (event.key === 'r'){
            cornerstoneHelpers.resetView();
            updateGUIElementsHelper.setSliceIdxHTMLForAllHTML()
        }
    });
}

export {setMouseAndKeyboardEvents};