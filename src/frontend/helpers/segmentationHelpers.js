import * as config from './config.js';
import * as updateGUIElementsHelper from './updateGUIElementsHelper.js';

import dcmjs from 'dcmjs';
import * as dicomWebClient from "dicomweb-client";

import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstone3DTools from "@cornerstonejs/tools";
import * as cornerstoneAdapters from "@cornerstonejs/adapters";



function setSegmentationIndexColor(paramToolGroupId, paramSegUID, segmentationIndex, colorRGBAArray) {
    /**
     * cornerstone3DTools.segmentation.{state, config, segmentIndex}
     */
    cornerstone3DTools.segmentation.config.color.setColorForSegmentIndex(paramToolGroupId, paramSegUID, segmentationIndex, colorRGBAArray);
    // cornerstone3DTools.segmentation.config.color.setColorForSegmentIndex(paramToolGroupId, paramSegUID, segmentationIndex, [0,255,0,255]);
}

function setSegmentationIndexOpacity(paramToolGroupId, paramSegUID, segmentationIndex, colorRGBAArray) {
    /**
     * cornerstone3DTools.segmentation.{state, config, segmentIndex}
     */
    cornerstone3DTools.segmentation.config.visibility.setSegmentVisibility(paramToolGroupId, paramSegUID, segmentationIndex, colorRGBAArray);
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

async function addSegmentationToState(segmentationIdParam, segType, geometryIds=[], verbose=false){
    // NOTE: segType = cornerstone3DTools.Enums.SegmentationRepresentations.{Labelmap, Contour}

    // Step 0 - Init
    let derivedVolume;
    if (verbose) console.log(' - [addSegmentationToState(',segmentationIdParam,')][before] allSegIdsAndUIDs: ', await cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations())

    // Step 1 - Create a segmentation volume
    if (segType === cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap)
        derivedVolume = await cornerstone3D.volumeLoader.createAndCacheDerivedSegmentationVolume(config.volumeIdCT, {volumeId: segmentationIdParam,});

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
    const segReprUIDs = await cornerstone3DTools.segmentation.addSegmentationRepresentations(config.toolGroupIdContours, [
        // {segmentationId:segmentationIdParam, type: segType,}, //options: { polySeg: { enabled: true, }, },
        {segmentationId:segmentationIdParam, type: segType, }, // options: { polySeg: { enabled: true, }, },
    ]);

    // Step 4 - More stuff for Contour
    if (segType === cornerstone3DTools.Enums.SegmentationRepresentations.Contour){
        const segmentation = cornerstone3DTools.segmentation;
        segmentation.activeSegmentation.setActiveSegmentationRepresentation(config.toolGroupIdContours,segReprUIDs[0]);
        segmentation.segmentIndex.setActiveSegmentIndex(segmentationIdParam, 1);
    }
    
    if (verbose) console.log(' - [addSegmentationToState(',segmentationIdParam,')][after] allSegIdsAndUIDs: ', await cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations())
    return {derivedVolume, segReprUIDs}
}

async function fetchAndLoadDCMSeg(searchObj, imageIds, maskType){
    /**
     * Fetches and loads a segmentation (SEG/RTSTRUCT) from the DICOMweb server (usually localhost:8042)
     *  - Currently RTSTRUCT is not relevant to the project, only SEG
     * Parameters:
     * - searchObj: Object containing the search parameters
     * - imageIds: Array of imageIds
     *  - e.g. [wadors:https://10.161.139.208:50000/dicom-web/studies/1.2.826.0.1.3680043.8.498.10172588745061765730458383563988183172/series/1.2.826.0.1.3680043.8.498.30041466412873709825126264925379453754/instances/1.2.826.0.1.3680043.8.498.64076707223165973969523030097758451449/frames/1, ...]
     * - maskType: Type of mask (MASK_TYPE_PRED, MASK_TYPE_GT, MASK_TYPE_REFINE)
     */
    // ---------------------------------------------- Step 1.1 - Create client Obj
    const client = new dicomWebClient.api.DICOMwebClient({
        url: searchObj.wadoRsRoot
    });

    // ---------------------------------------------- Step 1.2 - Fetch and created seg/rtstruct dataset
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
        // const urlTmp = `${client.wadoURL}/studies/${searchObj.StudyInstanceUID}/series/${searchObj.SeriesInstanceUID}/instances/${searchObj.SOPInstanceUID}`;
        // console.log('   -- [fetchAndLoadDCMSeg()] urlTmp: ', urlTmp)

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
    
    // ---------------------------------------------- Step 2 - Load the segmentation (seg/rtstruct) data
    // Step 2.1 - Load rtstruct
    if (dataset.Modality === config.MODALITY_RTSTRUCT){
        
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
        if (maskType == config.MASK_TYPE_GT){
            segmentationId = [config.gtSegmentationIdBase, config.MODALITY_RTSTRUCT, cornerstone3D.utilities.uuidv4()].join('::');
        } else if (maskType == config.MASK_TYPE_PRED){
            segmentationId = [config.predSegmentationIdBase, config.MODALITY_RTSTRUCT, cornerstone3D.utilities.uuidv4()].join('::');
        }
        const {segReprUIDs} = await addSegmentationToState(segmentationId, cornerstone3DTools.Enums.SegmentationRepresentations.Contour, geometryIds);

        // Step 5 - Set variables and colors
        try{
            // console.log(' - [fetchAndLoadDCMSeg(',maskType,')]: segReprUIDs: ', segReprUIDs)
            if (maskType == MASK_TYPE_GT){
                global.gtSegmentationId   = segmentationId;
                global.gtSegmentationUIDs = segReprUIDs;
                // setSegmentationIndexColor(config.toolGroupIdContours, segReprUIDs[0], 1, COLOR_RGBA_ARRAY_GREEN);
            } else if (maskType == MASK_TYPE_PRED){
                global.predSegmentationId   = segmentationId;
                global.predSegmentationUIDs = segReprUIDs;
                // setSegmentationIndexColor(config.toolGroupIdContours, segReprUIDs[0], 1, COLOR_RGBA_ARRAY_RED);
            }
        } catch (error){
            console.log('   -- [fetchAndLoadDCMSeg()] Error: ', error);
        }

    }
    // Step 2.2 - Load seg
    else if (dataset.Modality === config.MODALITY_SEG){
        // Step 2 - Read dicom tags and generate a "toolState".
        // Important keys here are toolState.segmentsOnFrame (for debugging) and toolState.labelmapBufferArray
        // console.log('   -- [fetchAndLoadDCMSeg()] maskType: ', maskType, ' || imageIds[0]', imageIds[0])
        try{
            const generateToolState = await cornerstoneAdapters.adaptersSEG.Cornerstone3D.Segmentation.generateToolState(
                imageIds,
                arrayBuffer,
                cornerstone3D.metaData
            );
            // console.log('\n - [fetchAndLoadDCMSeg()] generateToolState: ', generateToolState)

            // Step 3 - Add a new segmentation to cornerstone3D
            let segmentationId;
            if (maskType == config.MASK_TYPE_GT){
                segmentationId = [config.gtSegmentationIdBase, config.MODALITY_SEG, cornerstone3D.utilities.uuidv4()].join('::');
            } else if (maskType == config.MASK_TYPE_PRED){
                segmentationId = [config.predSegmentationIdBase, config.MODALITY_SEG, cornerstone3D.utilities.uuidv4()].join('::');
            } else if (maskType == config.MASK_TYPE_REFINE){
                segmentationId = [config.predSegmentationIdBase, config.MODALITY_SEG, cornerstone3D.utilities.uuidv4()].join('::');
            }
            const {derivedVolume, segReprUIDs} = await addSegmentationToState(segmentationId, cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap);
            
            // Step 4 - Add the dicom buffer to cornerstone3D segmentation 
            const derivedVolumeScalarData     = await derivedVolume.getScalarData();
            await derivedVolumeScalarData.set(new Uint8Array(generateToolState.labelmapBufferArray[0]));
            
            
            // Step 5 - Set variables and colors
            try{
                // console.log(' - [fetchAndLoadDCMSeg(',maskType,')]: segReprUIDs: ', segReprUIDs)
                if (maskType == config.MASK_TYPE_GT){
                    config.setGtSegmentationId(segmentationId);
                    config.setGtSegmentationUIDs(segReprUIDs);
                    // global.gtSegmentationId   = segmentationId;
                    // global.gtSegmentationUIDs = segReprUIDs;
                    setSegmentationIndexColor(config.toolGroupIdContours, segReprUIDs[0], 1, config.COLOR_RGBA_ARRAY_GREEN);
                    if (config.userCredRole == config.USERROLE_EXPERT)
                        setSegmentationIndexOpacity(config.toolGroupIdContours, segReprUIDs[0], 1, 0);
                } else if (maskType == config.MASK_TYPE_PRED){
                    config.setPredSegmentationId(segmentationId);
                    config.setPredSegmentationUIDs(segReprUIDs);
                    // global.predSegmentationId   = segmentationId;
                    // global.predSegmentationUIDs = segReprUIDs;
                    setSegmentationIndexColor(config.toolGroupIdContours, segReprUIDs[0], 1, config.COLOR_RGBA_ARRAY_RED);
                } else if (maskType == config.MASK_TYPE_REFINE){
                    config.setPredSegmentationId(segmentationId);
                    config.setPredSegmentationUIDs(segReprUIDs);
                    // global.predSegmentationId   = segmentationId;
                    // global.predSegmentationUIDs = segReprUIDs;
                    setSegmentationIndexColor(config.toolGroupIdContours, segReprUIDs[0], 1, config.COLOR_RGBA_ARRAY_PINK);
                }
            } catch (error){
                console.log('   -- [fetchAndLoadDCMSeg()] For maskType:', maskType, ' || Error: ', error);
            }

            // Step 99 - ?
            await updateGUIElementsHelper.setSliceIdxForViewPortFromGlobalSliceIdxVars(false)

        } catch (error){
            console.log('   -- [fetchAndLoadDCMSeg()] For maskType:', maskType, ' || Error: ', error);
        }
        
        
    }

}

// ******************************* UTILS ********************************************

function generateMockMetadata(segmentIndex, color) {
    const RecommendedDisplayCIELabValue = dcmjs.data.Colors.rgb2DICOMLAB(
        color.slice(0, 3).map(value => value / 255)
    ).map(value => Math.round(value));

    return {
        SegmentedPropertyCategoryCodeSequence: {
            CodeValue: "T-D0050",
            CodingSchemeDesignator: "SRT",
            CodeMeaning: "Tissue"
        },
        SegmentNumber: segmentIndex.toString(),
        SegmentLabel: "GTVp",
        SegmentAlgorithmType: "MANUAL",
        SegmentAlgorithmName: "Manual-Refine-BrushOREraser",
        RecommendedDisplayCIELabValue,
        SegmentedPropertyTypeCodeSequence: {
            CodeValue: "T-D0050",
            CodingSchemeDesignator: "SRT",
            CodeMeaning: "Tissue"
        }
    };
}


export {addSegmentationToState, fetchAndLoadDCMSeg}
export {setSegmentationIndexOpacity}
export {generateMockMetadata}