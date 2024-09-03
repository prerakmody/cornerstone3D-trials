import * as config from './config.js';
import * as cornerstone3D from '@cornerstonejs/core';

// ******************************* SliceIdx handling ********************************************

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


export {setSliceIdxHTMLForViewPort, setSliceIdxHTMLForAllHTML}