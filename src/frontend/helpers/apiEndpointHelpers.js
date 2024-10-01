import * as config from './config.js';
import * as updateGUIElementsHelper from './updateGUIElementsHelper.js';
import * as annotationHelpers from './annotationHelpers.js';
import * as segmentationHelpers from './segmentationHelpers.js';
import * as cornerstoneHelpers from './cornerstoneHelpers.js';

import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstone3DTools from '@cornerstonejs/tools';


async function getOrthancPatientIds() {
    let res = {};

    try {
        // Step 1 - Get Orthanc Patient IDs
        let query = `${config.URL_ROOT}/patients`;
        let response = await fetch(query);
        if (response.ok) {
            let patientOrthancIds = await response.json();
            for (let patientOrthancId of patientOrthancIds) {

                // Step 2 - Get Patient Data
                let patientQuery = `${config.URL_ROOT}/patients/${patientOrthancId}`;
                let patientResponse = await fetch(patientQuery);
                if (patientResponse.ok) {
                    let patientData = await patientResponse.json();
                    let patientActualId = patientData.MainDicomTags.PatientID;
                    let patientStudiesOrthancIds = patientData.Studies;
                    res[patientActualId] = {
                        [config.KEY_ORTHANC_ID]: patientOrthancId,
                        [config.KEY_STUDIES]: []
                    };
                    for (let patientStudiesOrthancId of patientStudiesOrthancIds) {
                        res[patientActualId][config.KEY_STUDIES].push({[config.KEY_STUDIES_ORTHANC_ID]: patientStudiesOrthancId, [config.KEY_STUDY_UID]: null, [config.KEY_SERIES]: []});
                        
                        // Step 3 - Get Study Data
                        let studyRequest = `${config.URL_ROOT}/studies/${patientStudiesOrthancId}`;
                        let studyResponse = await fetch(studyRequest);
                        if (studyResponse.ok) {
                            let studyData = await studyResponse.json();
                            let studyUID = studyData.MainDicomTags.StudyInstanceUID;
                            res[patientActualId][config.KEY_STUDIES][res[patientActualId][config.KEY_STUDIES].length - 1][config.KEY_STUDY_UID] = studyUID;
                            let seriesOrthancIds = studyData.Series;
                            for (let seriesOrthancId of seriesOrthancIds) {
                                res[patientActualId][config.KEY_STUDIES][res[patientActualId][config.KEY_STUDIES].length - 1][config.KEY_SERIES].push(
                                    {
                                        [config.KEY_SERIES_ORTHANC_ID]: seriesOrthancId
                                        , [config.KEY_SERIES_DESC]: null
                                        , [config.KEY_SERIES_UID]: null
                                        , [config.KEY_MODALITY]: null
                                        , [config.KEY_INSTANCE_UID]: null
                                        , [config.KEY_INSTANCE_ORTHANC_ID]: null
                                    }
                                );
                                
                                // Step 4 - Get Series Data
                                let seriesRequest = `${config.URL_ROOT}/series/${seriesOrthancId}`;
                                let seriesResponse = await fetch(seriesRequest);
                                if (seriesResponse.ok) {
                                    let seriesData = await seriesResponse.json();
                                    let seriesDesc = seriesData.MainDicomTags.SeriesDescription || null;
                                    let seriesUID = seriesData.MainDicomTags.SeriesInstanceUID;
                                    let modality = seriesData.MainDicomTags.Modality;
                                    let lastSeriesIndex = res[patientActualId][config.KEY_STUDIES][res[patientActualId][config.KEY_STUDIES].length - 1][config.KEY_SERIES].length - 1;
                                    res[patientActualId][config.KEY_STUDIES][res[patientActualId][config.KEY_STUDIES].length - 1][config.KEY_SERIES][lastSeriesIndex][config.KEY_SERIES_DESC] = seriesDesc;
                                    res[patientActualId][config.KEY_STUDIES][res[patientActualId][config.KEY_STUDIES].length - 1][config.KEY_SERIES][lastSeriesIndex][config.KEY_SERIES_UID] = seriesUID;
                                    res[patientActualId][config.KEY_STUDIES][res[patientActualId][config.KEY_STUDIES].length - 1][config.KEY_SERIES][lastSeriesIndex][config.KEY_MODALITY] = modality;
                                    
                                    // Step 5 - Get Instance Data (for SEG only)
                                    if (modality === config.MODALITY_SEG || modality === config.MODALITY_RTSTRUCT) {
                                        let instanceRequest = `${config.URL_ROOT}/instances/${seriesData.Instances[0]}`;
                                        let instanceResponse = await fetch(instanceRequest);
                                        if (instanceResponse.ok) {
                                            let instanceData = await instanceResponse.json();
                                            let instanceUID = instanceData.MainDicomTags.SOPInstanceUID;
                                            res[patientActualId][config.KEY_STUDIES][res[patientActualId][config.KEY_STUDIES].length - 1][config.KEY_SERIES][lastSeriesIndex][config.KEY_INSTANCE_UID] = instanceUID;
                                            res[patientActualId][config.KEY_STUDIES][res[patientActualId][config.KEY_STUDIES].length - 1][config.KEY_SERIES][lastSeriesIndex][config.KEY_INSTANCE_ORTHANC_ID] = instanceData.ID;
                                        } else {
                                            console.error(' - [getOrthancPatientIds()] instanceResponse: ', instanceResponse.status, instanceResponse.statusText);
                                        }
                                    }
                                } else {
                                    console.error(' - [getOrthancPatientIds()] seriesResponse: ', seriesResponse.status, seriesResponse.statusText);
                                }
                            }
                        } else {
                            console.error(' - [getOrthancPatientIds()] studyResponse: ', studyResponse.status, studyResponse.statusText);
                        }
                    }
                } else {
                    console.error(' - [getOrthancPatientIds()] patientResponse: ', patientResponse.status, patientResponse.statusText);
                }
            }
        } else {
            console.error(' - [getOrthancPatientIds()] response: ', response.status, response.statusText);
        }
    } catch (error) {
        console.error(error);
    }

    console.log(' - [getOrthancPatientIds()] res: ', res);
    return res;
}

async function getDataURLs(verbose = false){

    let orthanDataURLS = config.orthanDataURLS
    ////////////////// Non-SEG Datasets //////////////////
    // Example 1 (C3D - CT + PET)
    orthanDataURLS.push({
        caseName : 'C3D - CT + PET',
        reverseImageIds  : true,
        searchObjCT: {
            StudyInstanceUID : '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
            SeriesInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561',
            wadoRsRoot       : 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
        }, searchObjPET:{
            StudyInstanceUID : '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
            SeriesInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7009.2403.879445243400782656317561081015',
            wadoRsRoot       : 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
        }, searchObjRTSGT:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            SOPInstanceUID:'',
            wadoRsRoot: '',
        }, searchObjRTSPred:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            SOPInstanceUID:'',
            wadoRsRoot: '',
        },
    });

    ////////////////// SEG Datasets //////////////////
    // Example 2 (C3D - Abdominal CT + SEG) (StageII-Colorectal-CT-005: ) - https://www.cornerstonejs.org/live-examples/segmentationvolume
    // [NOTE: Unable to find on SEG on TCIA]
    orthanDataURLS.push({
        caseName :'C3D - Abdominal CT + SEG',
        reverseImageIds  : true,
        searchObjCT:{
            StudyInstanceUID : "1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458",
            SeriesInstanceUID: "1.3.6.1.4.1.14519.5.2.1.40445112212390159711541259681923198035",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjPET:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            wadoRsRoot: '',
        },searchObjRTSGT : {
            StudyInstanceUID : "1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458",
            SeriesInstanceUID: "1.2.276.0.7230010.3.1.3.481034752.2667.1663086918.611582",
            SOPInstanceUID   : "1.2.276.0.7230010.3.1.4.481034752.2667.1663086918.611583",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjRTSPred:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            SOPInstanceUID:'',
            wadoRsRoot: '',
        },
    });
    // Try in postman - https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458/series/1.3.6.1.4.1.14519.5.2.1.40445112212390159711541259681923198035/metadata

    // Example 3 (C3D - MR + SEG) - https://www.cornerstonejs.org/live-examples/segmentationvolume
    orthanDataURLS.push({
        caseName : 'C3D - MR + SEG',
        reverseImageIds  : true,
        searchObjCT : {
            StudyInstanceUID : "1.3.12.2.1107.5.2.32.35162.30000015050317233592200000046",
            SeriesInstanceUID: "1.3.12.2.1107.5.2.32.35162.1999123112191238897317963.0.0.0",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjPET:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            wadoRsRoot: '',
        }, searchObjRTSGT : {
            StudyInstanceUID : "1.3.12.2.1107.5.2.32.35162.30000015050317233592200000046",
            SeriesInstanceUID: "1.2.276.0.7230010.3.1.3.296485376.8.1542816659.201008",
            SOPInstanceUID   : "1.2.276.0.7230010.3.1.4.296485376.8.1542816659.201009",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjRTSPred:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            SOPInstanceUID:'',
            wadoRsRoot: '',
        },
    });

    // Example 4 (C3D - HCC - CT + SEG) (HCC-TACE-SEG --> HCC_004) (no e.g. figured out from https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies)
    // CT: https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.14519.5.2.1.1706.8374.643249677828306008300337414785/series/1.3.6.1.4.1.14519.5.2.1.1706.8374.285388762605622963541285440661/metadata
    // SEG: https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.14519.5.2.1.1706.8374.643249677828306008300337414785/series/1.2.276.0.7230010.3.1.3.8323329.773.1600928601.639561/metadata (Ctrl+F="instances")
    //  - https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.14519.5.2.1.1706.8374.643249677828306008300337414785/series/1.2.276.0.7230010.3.1.3.8323329.773.1600928601.639561/instances
    //  - [Works] https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.14519.5.2.1.1706.8374.643249677828306008300337414785/series/1.2.276.0.7230010.3.1.3.8323329.773.1600928601.639561/instances/1.2.276.0.7230010.3.1.4.8323329.773.1600928601.639562/metadata
    //  - [downloads] https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.14519.5.2.1.1706.8374.643249677828306008300337414785/series/1.2.276.0.7230010.3.1.3.8323329.773.1600928601.639561/instances/1.2.276.0.7230010.3.1.4.8323329.773.1600928601.639562
    orthanDataURLS.push({
        caseName : 'C3D - HCC - CT + SEG',
        reverseImageIds  : true,
        searchObjCT : {
            StudyInstanceUID : "1.3.6.1.4.1.14519.5.2.1.1706.8374.643249677828306008300337414785",
            SeriesInstanceUID: "1.3.6.1.4.1.14519.5.2.1.1706.8374.285388762605622963541285440661",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjPET:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            wadoRsRoot: '',
        }, searchObjRTSGT : {
            StudyInstanceUID : "1.3.6.1.4.1.14519.5.2.1.1706.8374.643249677828306008300337414785",
            SeriesInstanceUID: "1.2.276.0.7230010.3.1.3.8323329.773.1600928601.639561",
            SOPInstanceUID   : "1.2.276.0.7230010.3.1.4.8323329.773.1600928601.639562",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjRTSPred:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            SOPInstanceUID:'',
            wadoRsRoot: '',
        },
    });

    // Example 5 (C3D - Prostate MR + SEG) (QIN-PROSTATE-Repeatability --> PCAMPMRI-00012)
    // NOTE: Issue with overlapping segmentations
    orthanDataURLS.push({
        caseName :'C3D - QIN Prostate MR + SEG',
        reverseImageIds  : true,
        searchObjCT:{
            StudyInstanceUID : "1.3.6.1.4.1.14519.5.2.1.3671.4754.298665348758363466150039312520",
            SeriesInstanceUID: "1.3.6.1.4.1.14519.5.2.1.3671.4754.230497515093449653192531406300",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjPET:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            wadoRsRoot: '',
        },searchObjRTSGT : {
            StudyInstanceUID : "1.3.6.1.4.1.14519.5.2.1.3671.4754.298665348758363466150039312520",
            SeriesInstanceUID: "1.2.276.0.7230010.3.1.3.1426846371.300.1513205181.722",
            SOPInstanceUID   : "1.2.276.0.7230010.3.1.4.1426846371.300.1513205181.723",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjRTSPred:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            SOPInstanceUID:'',
            wadoRsRoot: '',
        },
    });

    ////////////////// RTSTRUCT Datasets //////////////////
    // Example 6 (C3D - Lung CT + RTSTruct) (NSCLC-Radiomics --> LUNG1-008)
    // Note: Unable to find RTSTRUCT on cloudfront.net
    // RTSTRUCT: https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.32722.99.99.62087908186665265759322018723889952421/series/1.3.6.1.4.1.32722.99.99.305113343545091133620858778081884399262
    // -- https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.32722.99.99.62087908186665265759322018723889952421/series/1.3.6.1.4.1.32722.99.99.305113343545091133620858778081884399262/instances
    // -- [Works] https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.32722.99.99.62087908186665265759322018723889952421/series/1.3.6.1.4.1.32722.99.99.305113343545091133620858778081884399262/instances/1.3.6.1.4.1.32722.99.99.220766358736397890612249814518504349204/metadata
    // -- [Nope]  https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.32722.99.99.62087908186665265759322018723889952421/series/1.3.6.1.4.1.32722.99.99.305113343545091133620858778081884399262/instances/1.3.6.1.4.1.32722.99.99.220766358736397890612249814518504349204
    const lungCTRTSTRUCTObj = {
        caseName :'C3D - Lung CT + RTSTRUCT',
        reverseImageIds  : true,
        searchObjCT:{
            StudyInstanceUID : "1.3.6.1.4.1.32722.99.99.62087908186665265759322018723889952421",
            SeriesInstanceUID: "1.3.6.1.4.1.32722.99.99.12747108866907265023948393821781944475",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjPET:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            wadoRsRoot: '',
        },searchObjRTSGT : {
            StudyInstanceUID : "1.3.6.1.4.1.32722.99.99.62087908186665265759322018723889952421",
            SeriesInstanceUID: "1.3.6.1.4.1.32722.99.99.305113343545091133620858778081884399262",
            SOPInstanceUID   : "1.3.6.1.4.1.32722.99.99.220766358736397890612249814518504349204",
            wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
        }, searchObjRTSPred:{
            StudyInstanceUID: '',
            SeriesInstanceUID:'',
            SOPInstanceUID:'',
            wadoRsRoot: '',
        },
    }
    orthanDataURLS.push(lungCTRTSTRUCTObj);

    if (process.env.NETLIFY === "true"){
        if (verbose)        
            console.log(' - [getData()] Running on Netlify. Getting data from cloudfront for caseNumber: ', caseNumber);   
        
    }
    else {
        if (verbose)
            console.log(' - [getData()] Running on localhost. Getting data from local orthanc.')

        if (false){
            // Example 1 - ProstateX-004 
            orthanDataURLS.push({
                caseName : 'ProstateX-004',
                searchObjCT: {
                    StudyInstanceUID : '1.3.6.1.4.1.14519.5.2.1.7311.5101.170561193612723093192571245493',
                    SeriesInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7311.5101.206828891270520544417996275680',
                    wadoRsRoot       : `${window.location.origin}/dicom-web`,
                }, searchObjPET:{
                    StudyInstanceUID: '',
                    SeriesInstanceUID:'',
                    wadoRsRoot: '',
                }, searchObjRTSGT:{
                    StudyInstanceUID: '',
                    SeriesInstanceUID:'',
                    SOPInstanceUID:'',
                    wadoRsRoot: '',
                }, searchObjRTSPred:{
                    StudyInstanceUID: '',
                    SeriesInstanceUID:'',
                    SOPInstanceUID:'',
                    wadoRsRoot: '',
                },
            });
            // http://localhost:8042/dicom-web/studies/1.2.826.0.1.3680043.8.498.12735767346218857049599303193606099695
            // http://localhost:8042/dicom-web/studies/1.2.826.0.1.3680043.8.498.12735767346218857049599303193606099695/series

            // http://localhost:8042/dicom-web/studies/1.2.826.0.1.3680043.8.498.12735767346218857049599303193606099695/series/1.2.826.0.1.3680043.8.498.88933515603927308812086492012007971976
            // http://localhost:8042/dicom-web/studies/1.2.826.0.1.3680043.8.498.12735767346218857049599303193606099695/series/1.2.826.0.1.3680043.8.498.88933515603927308812086492012007971976/instances
            
            // http://localhost:8042/dicom-web/studies/1.2.826.0.1.3680043.8.498.12735767346218857049599303193606099695/series/1.2.826.0.1.3680043.8.498.88933515603927308812086492012007971976/instances/1.2.826.0.1.3680043.8.498.11644186160694132628393551238679963095
            // http://localhost:8042/dicom-web/studies/1.2.826.0.1.3680043.8.498.12735767346218857049599303193606099695/series/1.2.826.0.1.3680043.8.498.88933515603927308812086492012007971976/instances/1.2.826.0.1.3680043.8.498.11644186160694132628393551238679963095/metadata

            // Example 2 - HCAI-Interactive-XX
            //// --> (Try in postman) http://localhost:8042/dicom-web/studies/1.2.752.243.1.1.20240123155004085.1690.65801/series/1.2.752.243.1.1.20240123155004085.1700.14027/metadata
            orthanDataURLS.push({
                caseName : 'HCAI-Interactive-XX (CT + PET)',
                searchObjCT : {
                    StudyInstanceUID  : '1.2.752.243.1.1.20240123155004085.1690.65801',
                    SeriesInstanceUID : '1.2.752.243.1.1.20240123155006526.5320.21561',
                    wadoRsRoot        : `${window.location.origin}/dicom-web`
                }, searchObjPET:{
                    StudyInstanceUID : '1.2.752.243.1.1.20240123155004085.1690.65801',
                    SeriesInstanceUID: '1.2.752.243.1.1.20240123155004085.1700.14027',
                    wadoRsRoot       : `${window.location.origin}/dicom-web`
                }, searchObjRTSGT:{
                    StudyInstanceUID : '',
                    SeriesInstanceUID:'',
                    SOPInstanceUID   :'',
                    wadoRsRoot       : '',
                }, searchObjRTSPred:{
                    StudyInstanceUID : '',
                    SeriesInstanceUID:'',
                    SOPInstanceUID   :'',
                    wadoRsRoot       : '',
                },
            });

            // Example 3 - https://www.cornerstonejs.org/live-examples/segmentationvolume
            orthanDataURLS.push({
                caseName :'C3D - Abdominal CT + RTSS',
                searchObjCT:{
                    StudyInstanceUID : "1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458",
                    SeriesInstanceUID: "1.3.6.1.4.1.14519.5.2.1.40445112212390159711541259681923198035",
                    wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
                }, searchObjPET:{
                    StudyInstanceUID: '',
                    SeriesInstanceUID:'',
                    wadoRsRoot: '',
                },searchObjRTSGT : {
                    StudyInstanceUID : "1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458",
                    SeriesInstanceUID: "1.2.276.0.7230010.3.1.3.481034752.2667.1663086918.611582",
                    SOPInstanceUID   : "1.2.276.0.7230010.3.1.4.481034752.2667.1663086918.611583",
                    wadoRsRoot       : "https://d33do7qe4w26qo.cloudfront.net/dicomweb"
                }, searchObjRTSPred:{
                    StudyInstanceUID: '',
                    SeriesInstanceUID:'',
                    SOPInstanceUID:'',
                    wadoRsRoot: '',
                },
            });     
        }else{
            
            const orthancData = await getOrthancPatientIds();
            for (let patientId in orthancData) {
                let patientObj = { caseName : patientId, 
                    searchObjCT     : { StudyInstanceUID : '', SeriesInstanceUID : '', SOPInstanceUID : '', wadoRsRoot : '' }, 
                    searchObjPET    : { StudyInstanceUID : '', SeriesInstanceUID : '', SOPInstanceUID : '', wadoRsRoot : '' }, 
                    searchObjRTSGT  : { StudyInstanceUID : '', SeriesInstanceUID : '', SOPInstanceUID : '', wadoRsRoot : '', }, 
                    searchObjRTSPred: { StudyInstanceUID : '', SeriesInstanceUID : '', SOPInstanceUID : '', wadoRsRoot : '', }, 
                }

                for (let study of orthancData[patientId][config.KEY_STUDIES]) {
                    for (let series of study[config.KEY_SERIES]) {
                        if (series[config.KEY_MODALITY] === config.MODALITY_CT || series[config.KEY_MODALITY] === config.MODALITY_MR) {
                            patientObj.searchObjCT.StudyInstanceUID  = study[config.KEY_STUDY_UID];
                            patientObj.searchObjCT.SeriesInstanceUID = series[config.KEY_SERIES_UID];
                            patientObj.searchObjCT.wadoRsRoot        = `${window.location.origin}/dicom-web`;
                        } else if (series[config.KEY_MODALITY] === config.MODALITY_PT) {
                            patientObj.searchObjPET.StudyInstanceUID  = study[config.KEY_STUDY_UID];
                            patientObj.searchObjPET.SeriesInstanceUID = series[config.KEY_SERIES_UID];
                            patientObj.searchObjPET.wadoRsRoot        = `${window.location.origin}/dicom-web`;
                        } else if (series[config.KEY_MODALITY] === config.MODALITY_SEG) {
                            if (series[config.KEY_SERIES_DESC].toLowerCase().includes('seg-gt')) {
                                patientObj.searchObjRTSGT.StudyInstanceUID  = study[config.KEY_STUDY_UID];
                                patientObj.searchObjRTSGT.SeriesInstanceUID = series[config.KEY_SERIES_UID];
                                patientObj.searchObjRTSGT.SOPInstanceUID    = series[config.KEY_INSTANCE_UID];
                                patientObj.searchObjRTSGT.wadoRsRoot        = `${window.location.origin}/dicom-web`;
                            } else if (series[config.KEY_SERIES_DESC].toLowerCase().includes('seg-pred')) {
                                patientObj.searchObjRTSPred.StudyInstanceUID  = study[config.KEY_STUDY_UID];
                                patientObj.searchObjRTSPred.SeriesInstanceUID = series[config.KEY_SERIES_UID];
                                patientObj.searchObjRTSPred.SOPInstanceUID    = series[config.KEY_INSTANCE_UID];
                                patientObj.searchObjRTSPred.wadoRsRoot        = `${window.location.origin}/dicom-web`;
                            } else if (series[config.KEY_SERIES_DESC].toLowerCase().includes('refine')) {
                                // skip this series
                            }else {
                                patientObj.searchObjRTSGT.StudyInstanceUID  = study[config.KEY_STUDY_UID];
                                patientObj.searchObjRTSGT.SeriesInstanceUID = series[config.KEY_SERIES_UID];
                                patientObj.searchObjRTSGT.SOPInstanceUID    = series[config.KEY_INSTANCE_UID];
                                patientObj.searchObjRTSGT.wadoRsRoot        = `${window.location.origin}/dicom-web`;
                                // patientObj.reverseImageIds = true;
                            }
                        } else if (series[config.KEY_MODALITY] === config.MODALITY_RTSTRUCT) {
                            patientObj.searchObjRTSGT.StudyInstanceUID  = study[config.KEY_STUDY_UID];
                            patientObj.searchObjRTSGT.SeriesInstanceUID = series[config.KEY_SERIES_UID];
                            patientObj.searchObjRTSGT.SOPInstanceUID    = series[config.KEY_INSTANCE_UID];
                            patientObj.searchObjRTSGT.wadoRsRoot        = `${window.location.origin}/dicom-web`;
                        }
                    }
                }
                orthanDataURLS.push(patientObj);
            }
        }
        
    }

    config.setOrthanDataURLS(orthanDataURLS)
}

async function makeRequestToProcess(points3D, scribbleAnnotationUID, verbose=false){

    let requestStatus = false;
    let responseData  = {}
    const now = new Date();
    try{

        //------------------------------------------------------- Step 0 - Init
        console.log(' \n ----------------- Python server (/process) ----------------- \n')
        console.log('   -- [makeRequestToProcess()] patientIdx: ', config.patientIdx);
        console.log('   -- [makeRequestToProcess()] caseName: ', config.orthanDataURLS[config.patientIdx]['caseName']);
        updateGUIElementsHelper.setGlobalSliceIdxViewPortReferenceVars(verbose=true)

        //------------------------------------------------------- Step 1 - Make a request to /process
        const scribbleType = await annotationHelpers.getScribbleType();
        const processPayload = {
            [config.KEY_DATA]: {
                [config.KEY_POINTS_3D]: points3D
                , [config.KEY_SCRIB_TYPE]:scribbleType
                , [config.KEY_CASE_NAME]: config.orthanDataURLS[config.patientIdx]['caseName'],}
            , [config.KEY_IDENTIFIER]: config.instanceName,
        }
        await updateGUIElementsHelper.showLoaderAnimation();
        
        console.log('   -- [makeRequestToProcess()] processPayload: ', processPayload);
        try{
            const response = await fetch(config.URL_PYTHON_SERVER + config.ENDPOINT_PROCESS, {method: config.METHOD_POST, headers: config.HEADERS_JSON, body: JSON.stringify(processPayload), credentials: 'include',}); // credentials: 'include' is important for cross-origin requests
            const responseJSON = await response.json();
            requestStatus = true;
            console.log('   -- [makeRequestToProcess()] (view,sliceIdx): ', await annotationHelpers.getSliceIdxinPoints3D(points3D));
            console.log('   -- [makeRequestToProcess()] response       : ', response);
            console.log('   -- [makeRequestToProcess()] response.json(): ', responseJSON);
            
            
            //------------------------------------------------------- Step 2 - Remove old scribble annotation
            if (verbose) console.log('\n --------------- Removing old annotation ...  ---------------: ', scribbleAnnotationUID)
            await annotationHelpers.handleStuffAfterProcessEndpoint(scribbleAnnotationUID);

            if (response.status == 200){
                responseData = responseJSON.responseData    

                //------------------------------------------------------- Step 3 - Remove old segmentation
                const nowPostAIScribbleResponseDate = new Date();
                if (verbose) console.log('\n --------------- Removing old segmentation ...  ---------------: ')
                const allSegObjs = cornerstone3DTools.segmentation.state.getSegmentations();
                const allSegRepsObjs = cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations()[config.toolGroupIdContours];
                allSegObjs.forEach(segObj => {
                    if (segObj.segmentationId.includes(config.predSegmentationIdBase)){
                        if (verbose)console.log('   -- [makeRequestToProcess()] Removing segObj: ', segObj.segmentationId);
                        cornerstone3DTools.segmentation.state.removeSegmentation(segObj.segmentationId);
                        const thisSegRepsObj = allSegRepsObjs.filter(obj => obj.segmentationId === segObj.segmentationId)[0]
                        if (verbose)console.log('   -- [makeRequestToProcess()] Removing segRepsObj: ', thisSegRepsObj);
                        cornerstone3DTools.segmentation.removeSegmentationsFromToolGroup(config.toolGroupIdContours, [thisSegRepsObj.segmentationRepresentationUID,], true);
                        if (segObj.type == config.SEG_TYPE_LABELMAP){
                            cornerstone3D.cache.removeVolumeLoadObject(segObj.segmentationId);
                        }
                    }
                });
                if (verbose) console.log('   -- [makeRequestToProcess()] new allSegObjs: ', cornerstone3DTools.segmentation.state.getSegmentations())
                if (verbose) console.log('   -- [makeRequestToProcess()] new     allSegRepsObjs: ', cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations())
                
                //------------------------------------------------------- Step 4 - Add new segmentation
                if (verbose) console.log('\n --------------- Adding new segmentation ...  ---------------: ')
                try{
                    if (verbose) console.log(' - responseData: ', responseData)
                    const nowDcmSEGFetch = new Date();
                    await segmentationHelpers.fetchAndLoadDCMSeg(responseData, config.imageIdsCT, config.MASK_TYPE_REFINE)
                    const totalDcmSEGFetchSeconds = (new Date() - nowDcmSEGFetch) / 1000;
                    console.log('   -- [makeRequestToProcess()] Round-trip DcmSEG fetch completed in ', totalDcmSEGFetchSeconds, ' s');
                } catch (error){
                    console.error(' - [loadData()] Error in makeRequestToProcess(points3D, scribbleAnnotationUID): ', error);
                    updateGUIElementsHelper.showToast('Error in loading refined segmentation data', 3000);
                }
                
                const totalPostAIScribbleResponseSeconds = (new Date() - nowPostAIScribbleResponseDate) / 1000;
                const totalAIScribbleProcessingSeconds = (new Date() - now) / 1000;
                updateGUIElementsHelper.showToast(`AI Processing completed in ${totalAIScribbleProcessingSeconds} s`, 3000);
                console.log('   -- [makeRequestToProcess()] Round-trip AI Processing completed in ', totalAIScribbleProcessingSeconds, ' s with ', totalPostAIScribbleResponseSeconds, ' s post-AI scribble response processing');

                //------------------------------------------------------- Step 5 - Reset view to what it was

                setTimeout(async () => {
                    await updateGUIElementsHelper.setSliceIdxForViewPortFromGlobalSliceIdxVars(false)
                    await cornerstoneHelpers.renderNow()
                }, 100);

            } else {
                updateGUIElementsHelper.showToast('Python server - /process failed <br/>' + responseJSON.detail, 30000)
                await annotationHelpers.handleStuffAfterProcessEndpoint(scribbleAnnotationUID);
            }

        } catch (error){
            requestStatus = false;
            console.log('   -- [makeRequestToProcess()] Error: ', error);
            updateGUIElementsHelper.showToast('Python server - /process failed', 3000)
            await annotationHelpers.handleStuffAfterProcessEndpoint(scribbleAnnotationUID);
        }

    } catch (error){
        requestStatus = false;
        console.log('   -- [makeRequestToProcess()] Error: ', error);
        updateGUIElementsHelper.showToast('Python server - /process failed', 3000)
        await annotationHelpers.handleStuffAfterProcessEndpoint(scribbleAnnotationUID);
    }

    return {requestStatus, responseData};
}

export {getDataURLs}
export {makeRequestToProcess}