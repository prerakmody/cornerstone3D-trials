import * as config from './config.js';
import * as cornerstone3D from '@cornerstonejs/core';

// ******************************* SliceIdx handling ********************************************

// ******************************* SliceIdx handling ********************************************

function setGlobalSliceIdxViewPortReferenceVars(verbose=false){

    // Step 1 - Get relevant variables
    const {viewport: axialViewport, viewportId: axialViewportId}       = cornerstone3D.getEnabledElement(config.axialDiv);
    const {viewport: sagittalViewport, viewportId: sagittalViewportId} = cornerstone3D.getEnabledElement(config.sagittalDiv);
    const {viewport: coronalViewport, viewportId: coronalViewportId}   = cornerstone3D.getEnabledElement(config.coronalDiv);
    const {viewport: axialViewportPT, viewportId: axialViewportPTId}   = cornerstone3D.getEnabledElement(config.axialDivPT);
    const {viewport: sagittalViewportPT, viewportId: sagittalViewportPTId} = cornerstone3D.getEnabledElement(config.sagittalDivPT);
    const {viewport: coronalViewportPT, viewportId: coronalViewportPTId}   = cornerstone3D.getEnabledElement(config.coronalDivPT);

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

    const {viewport: axialViewport, viewportId: axialViewportId}       = cornerstone3D.getEnabledElement(config.axialDiv);
    const {viewport: sagittalViewport, viewportId: sagittalViewportId} = cornerstone3D.getEnabledElement(config.sagittalDiv);
    const {viewport: coronalViewport, viewportId: coronalViewportId}   = cornerstone3D.getEnabledElement(config.coronalDiv);
    const {viewport: axialViewportPT, viewportId: axialViewportPTId}   = cornerstone3D.getEnabledElement(config.axialDivPT);
    const {viewport: sagittalViewportPT, viewportId: sagittalViewportPTId} = cornerstone3D.getEnabledElement(config.sagittalDivPT);
    const {viewport: coronalViewportPT, viewportId: coronalViewportPTId}   = cornerstone3D.getEnabledElement(config.coronalDivPT);

    if (verbose)
        console.log(' - [setSliceIdxForViewPortFromGlobalSliceIdxVars()] Setting sliceIdx for viewport:', config.globalSliceIdxVars)   

    if (true){
        let axialViewportViewReference  = config.globalSliceIdxVars.axialViewPortReference
        await axialViewport.setViewReference(axialViewportViewReference)
        await axialViewport.setCamera(config.globalSliceIdxVars.axialCamera)

        let sagittalViewportViewReference = config.globalSliceIdxVars.sagittalViewportReference
        await sagittalViewport.setViewReference(sagittalViewportViewReference)
        await sagittalViewport.setCamera(config.globalSliceIdxVars.sagittalCamera)

        let coronalViewportViewReference = config.globalSliceIdxVars.coronalViewportReference
        await coronalViewport.setViewReference(coronalViewportViewReference)
        await coronalViewport.setCamera(config.globalSliceIdxVars.coronalCamera)

        let axialViewportViewReferencePT = config.globalSliceIdxVars.axialViewPortReferencePT
        await axialViewportPT.setViewReference(axialViewportViewReferencePT)
        await axialViewportPT.setCamera(config.globalSliceIdxVars.axialCameraPT)

        let sagittalViewportViewReferencePT = config.globalSliceIdxVars.sagittalViewportReferencePT
        await sagittalViewportPT.setViewReference(sagittalViewportViewReferencePT)
        await sagittalViewportPT.setCamera(config.globalSliceIdxVars.sagittalCameraPT)

        let coronalViewportViewReferencePT = config.globalSliceIdxVars.coronalViewportReferencePT
        await coronalViewportPT.setViewReference(coronalViewportViewReferencePT)
        await coronalViewportPT.setCamera(config.globalSliceIdxVars.coronalCameraPT)

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

    if (verbose){
        setGlobalSliceIdxViewPortReferenceVars()
        console.log(' - [setSliceIdxForViewPortFromGlobalSliceIdxVars()] Actual setting for viewport:', globalSliceIdxVars)
    }

}

function setSliceIdxHTMLForViewPort(activeViewportId, sliceIdxHTMLForViewport, totalImagesForViewPort){
    // NOTE: There is a difference betwen the numerical value of sliceIdxHTML and SliceIdxViewportReference
    if (activeViewportId == config.axialID){
        // console.log('Axial: ', imageIdxForViewport, totalImagesForViewPort)
        // const axialSliceDiv = config.getAxialSliceDiv()
        config.axialSliceDiv.innerHTML = `Axial: ${sliceIdxHTMLForViewport+1}/${totalImagesForViewPort}`
    } else if (activeViewportId == config.sagittalID){
        // const sagittalSliceDiv = config.getSagittalSliceDiv()
        config.sagittalSliceDiv.innerHTML = `Sagittal: ${sliceIdxHTMLForViewport+1}/${totalImagesForViewPort}`
    } else if (activeViewportId == config.coronalID){
        // const coronalSliceDiv = config.getCoronalSliceDiv()
        config.coronalSliceDiv.innerHTML = `Coronal: ${sliceIdxHTMLForViewport+1}/${totalImagesForViewPort}`
    } else if (activeViewportId == config.axialPTID){
        // const axialSliceDivPT = config.getAxialSliceDivPT()
        config.axialSliceDivPT.innerHTML = `Axial: ${sliceIdxHTMLForViewport+1}/${totalImagesForViewPort}`
    } else if (activeViewportId == config.sagittalPTID){
        // const sagittalSliceDivPT = config.getSagittalSliceDivPT()
        config.sagittalSliceDivPT.innerHTML = `Sagittal: ${sliceIdxHTMLForViewport+1}/${totalImagesForViewPort}`
    } else if (activeViewportId == config.coronalPTID){
        // const coronalSliceDivPT = config.getCoronalSliceDivPT()
        config.coronalSliceDivPT.innerHTML = `Coronal: ${sliceIdxHTMLForViewport+1}/${totalImagesForViewPort}`
    }
    else {
        console.error('Invalid viewportId:', activeViewportId)
    }
}

function setSliceIdxHTMLForAllHTML(){
    // NOTE: There is a difference betwen the numerical value of sliceIdxHTML and SliceIdxViewportReference
    const {viewport: axialViewport, viewportId: axialViewportId}       = cornerstone3D.getEnabledElement(config.axialDiv);
    const {viewport: sagittalViewport, viewportId: sagittalViewportId} = cornerstone3D.getEnabledElement(config.sagittalDiv);
    const {viewport: coronalViewport, viewportId: coronalViewportId}   = cornerstone3D.getEnabledElement(config.coronalDiv);
    const {viewport: axialViewportPT, viewportId: axialViewportPTId}   = cornerstone3D.getEnabledElement(config.axialDivPT);
    const {viewport: sagittalViewportPT, viewportId: sagittalViewportPTId} = cornerstone3D.getEnabledElement(config.sagittalDivPT);
    const {viewport: coronalViewportPT, viewportId: coronalViewportPTId}   = cornerstone3D.getEnabledElement(config.coronalDivPT);

    // Update slice numbers
    setSliceIdxHTMLForViewPort(axialViewportId, axialViewport.getCurrentImageIdIndex(), axialViewport.getNumberOfSlices())
    setSliceIdxHTMLForViewPort(sagittalViewportId, sagittalViewport.getCurrentImageIdIndex(), sagittalViewport.getNumberOfSlices())
    setSliceIdxHTMLForViewPort(coronalViewportId, coronalViewport.getCurrentImageIdIndex(), coronalViewport.getNumberOfSlices())
    setSliceIdxHTMLForViewPort(axialViewportPTId, axialViewportPT.getCurrentImageIdIndex(), axialViewportPT.getNumberOfSlices())
    setSliceIdxHTMLForViewPort(sagittalViewportPTId, sagittalViewportPT.getCurrentImageIdIndex(), sagittalViewportPT.getNumberOfSlices())
    setSliceIdxHTMLForViewPort(coronalViewportPTId, coronalViewportPT.getCurrentImageIdIndex(), coronalViewportPT.getNumberOfSlices())
}

// ******************************* Toast messages ********************************************
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

// ******************************* Loader Div ********************************************

async function getLoaderHTML(){

    // Step 1 - Create a loaderDiv
    const loaderDiv = document.getElementById(config.loaderDivId);
    if (loaderDiv == null){
        const loaderDiv = document.createElement('div');
        loaderDiv.id = config.loaderDivId;
        loaderDiv.style.display = 'none'; // Initially hidden

        // Step 2 - Create the gray-out div
        const grayOutDiv                 = document.createElement('div');
        grayOutDiv.id                    = config.grayOutDivId;
        grayOutDiv.style.position        = 'absolute';
        grayOutDiv.style.backgroundColor = 'rgba(128, 128, 128, 0.5)'; // Semi-transparent gray
        grayOutDiv.style.zIndex          = '999'; // Ensure it's below the loadingIndicator but above everything else
        // grayOutDiv.style.display         = 'none'; // Initially hidden

        // Step 3 - Create the loadingIndicatorDiv
        const loadingIndicatorDiv = document.createElement('div');
        loadingIndicatorDiv.id                 = config.loadingIndicatorDivId;
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
    const contentDiv          = document.getElementById(config.contentDivId);
    const loadingIndicatorDiv = document.getElementById(config.loadingIndicatorDivId);
    const grayOutDiv          = document.getElementById(config.grayOutDivId);

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


export {setGlobalSliceIdxViewPortReferenceVars, convertSliceIdxHTMLToSliceIdxViewportReference, setSliceIdxForViewPortFromGlobalSliceIdxVars}
export {setSliceIdxHTMLForViewPort, setSliceIdxHTMLForAllHTML}
export {showToast}
export {showLoaderAnimation, unshowLoaderAnimation}