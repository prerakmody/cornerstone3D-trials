"""
https://orthanc.uclouvain.be/api/index.html#tag/Patients
"""

import io
import pdb
import torch
import zipfile
import tempfile
import requests
import pydicom
import pprint
import traceback
import numpy as np
from pathlib import Path
import matplotlib.pyplot as plt

MODALITY_CT  = 'CT'
MODALITY_PT  = 'PT'
MODALITY_SEG = 'SEG'

URL_ROOT = 'http://localhost:8042'

KEY_ORTHANC_ID   = 'OrthancId'
KEY_STUDIES    = 'Studies'
KEY_SERIES     = 'Series'
KEY_STUDIES_ORTHANC_ID = 'StudiesOrthancId'
KEY_SERIES_ORTHANC_ID  = 'SeriesOrthancId'
KEY_STUDY_UID   = 'StudyUID'
KEY_SERIES_UID  = 'SeriesUID'
KEY_INSTANCE_UID = 'InstanceUID'
KEY_MODALITY    = 'Modality'

KEY_MODALITY_SEG = 'SEG'
KEY_SERIES_DESC  = 'SeriesDescription'

def getOrthancPatientIds():

    res = {}

    try:

        # Step 1 - Get Orthanc Patient IDs
        query = URL_ROOT + '/patients'
        response = requests.get(query, verify=False)
        if response.status_code == 200:
            patientOrthancIds = response.json()
            for patientOrthancId in patientOrthancIds:

                # Step 2 - Get Patient Data
                patientQuery = URL_ROOT + '/patients/' + patientOrthancId
                patientResponse = requests.get(patientQuery, verify=False)
                if patientResponse.status_code == 200:
                    patientData        = patientResponse.json()
                    patientActualId    = patientData['MainDicomTags']['PatientID']
                    patientStudiesOrthancIds = patientData['Studies']
                    res[patientActualId] = {
                        KEY_ORTHANC_ID: patientOrthancId,
                        KEY_STUDIES: []
                    }
                    for patientStudiesOrthancId in patientStudiesOrthancIds:
                        res[patientActualId][KEY_STUDIES].append({KEY_STUDIES_ORTHANC_ID: patientStudiesOrthancId, KEY_STUDY_UID: None, KEY_SERIES: []})
                        
                        # Step 3 - Get Study Data
                        studyRequest = URL_ROOT + '/studies/' + patientStudiesOrthancId
                        studyResponse = requests.get(studyRequest, verify=False)
                        if studyResponse.status_code == 200:
                            studyData = studyResponse.json()
                            studyUID  = studyData['MainDicomTags']['StudyInstanceUID']
                            res[patientActualId][KEY_STUDIES][-1][KEY_STUDY_UID] = studyUID
                            seriesOrthancIds = studyData['Series']
                            for seriesOrthancId in seriesOrthancIds:
                                res[patientActualId][KEY_STUDIES][-1][KEY_SERIES].append({KEY_SERIES_ORTHANC_ID: seriesOrthancId, KEY_SERIES_DESC: None, KEY_SERIES_UID: None, KEY_MODALITY: None, KEY_INSTANCE_UID: None})
                                
                                # Step 4 - Get Series Data
                                seriesRequest = URL_ROOT + '/series/' + seriesOrthancId
                                seriesResponse = requests.get(seriesRequest, verify=False)
                                if seriesResponse.status_code == 200:
                                    seriesData = seriesResponse.json()
                                    seriesDesc = seriesData['MainDicomTags'].get('SeriesDescription', None)
                                    seriesUID  = seriesData['MainDicomTags']['SeriesInstanceUID']
                                    modality   = seriesData['MainDicomTags']['Modality']
                                    res[patientActualId][KEY_STUDIES][-1][KEY_SERIES][-1][KEY_SERIES_DESC] = seriesDesc
                                    res[patientActualId][KEY_STUDIES][-1][KEY_SERIES][-1][KEY_SERIES_UID] = seriesUID
                                    res[patientActualId][KEY_STUDIES][-1][KEY_SERIES][-1][KEY_MODALITY] = modality
                                    
                                    # Step 5 - Get Instance Data (for SEG only)
                                    if modality == KEY_MODALITY_SEG:
                                        print (seriesData)
                                        instanceRequest = URL_ROOT + '/instances/' + seriesData['Instances'][0]
                                        instanceResponse = requests.get(instanceRequest, verify=False)
                                        if instanceResponse.status_code == 200:
                                            
                                            instanceData = instanceResponse.json()
                                            instanceUID  = instanceData['MainDicomTags']['SOPInstanceUID']
                                            res[patientActualId][KEY_STUDIES][-1][KEY_SERIES][-1][KEY_INSTANCE_UID] = instanceUID
                                        else:
                                            print (' - [getOrthancPatientIds()] instanceResponse: ', instanceResponse.status_code, instanceResponse.reason)
                                else:
                                    print (' - [getOrthancPatientIds()] seriesResponse: ', seriesResponse.status_code, seriesResponse.reason)
                        else:
                            print (' - [getOrthancPatientIds()] studyResponse: ', studyResponse.status_code, studyResponse.reason)
                        
                else:
                    print (' - [getOrthancPatientIds()] patientResponse: ', patientResponse.status_code, patientResponse.reason)
        else:
            print (' - [getOrthancPatientIds()] response: ', response.status_code, response.reason)
            
    except:
        traceback.print_exc()
        pdb.set_trace()
    
    return res

def getDownloadedFilePaths(tmpDirPath, zipContent):

    res = {}

    try:
        
        # Step 1 - Loop over zip files
        fileObj    = io.BytesIO(zipContent)
        zipObj     = zipfile.ZipFile(fileObj, 'r')
        for filename in zipObj.namelist():

            # Step 2 - Save file to disk
            zipObj.extract(filename, tmpDirPath)
            filePath = Path(tmpDirPath) / filename

            # Step 3 - Read DICOM file (for modality=[CT, PT, SEG])
            ds       = pydicom.dcmread(filePath, stop_before_pixels=True, specific_tags=[
                pydicom.tag.Tag((0x0008,0x0060)), pydicom.tag.Tag((0x0020, 0x0013))  
                ])
            
            if 'Modality' in ds:
                modality       = ds.Modality
            
            instanceNumber = None
            if 'InstanceNumber' in ds:
                instanceNumber = int(ds.InstanceNumber)
            
            if modality not in res: 
                if instanceNumber is not None:
                    res[modality] = {instanceNumber: filePath}
                else:
                    res[modality] = [filePath] # for rtstruct
            else: 
                res[modality][instanceNumber] = filePath

    except:
        traceback.print_exc()
        pdb.set_trace()
    

    # Step 99 - Sort MODALITY_CT and MODALITY_PT by key values and only keep the values
    if MODALITY_CT in res:
        res[MODALITY_CT] = [val for key, val in sorted(res[MODALITY_CT].items())]
    if MODALITY_PT in res:
        res[MODALITY_PT] = [val for key, val in sorted(res[MODALITY_PT].items())]
    
    return res

def convertDcmToTorchArray(dcmFilePaths):

    res = []

    try:
        
        for dcmFilePath in dcmFilePaths:
            ds = pydicom.dcmread(dcmFilePath)
            res.append(torch.Tensor(ds.pixel_array))

        if len(res):
            res = torch.stack(res,-1)

    except:
        traceback.print_exc()
        pdb.set_trace()

    return res

def plot(ctArray, ptArray, maskPredArray=None):
    """
    Params:
        ctArray: [H, W, D]
        ptArray: [H, W, D]
        maskPredArray: [H, W, D]
    """
    
    try:
        
        randomSliceIds = np.random.choice(ctArray.shape[2], 3)
        f,axarr = plt.subplots(len(randomSliceIds),3,figsize=(15,15))

        for i, sliceId in enumerate(randomSliceIds):

            # Plot CT
            axarr[i,0].imshow(ctArray[:,:,sliceId], cmap='gray')
            axrrr[i,0].set_ylabel('Slice: ' + str(sliceId))

            # Plot PT
            axarr[i,1].imshow(ptArray[:,:,sliceId], cmap='gray')

            # Plot Mask
            axarr[i,2].imshow(ctArray[:,:,sliceId], cmap='gray')
            axarr[i,2].imshow(ptArray[:,:,sliceId], cmap='gray', alpha=0.5)
            if maskPredArray is not None:
                axarr[i,2].contour(maskPredArray[:,:,sliceId])
        
        plt.show()


    except:
        traceback.print_exc()

def downloadPatientZip(patientId, patientIdObj):

    try:
        
        # Step 1 - Create a tmp folder
        with tempfile.TemporaryDirectory() as tmpDirPath:
            print (' - tmpDirPath: ', tmpDirPath)

            # Step 2 - Get Orthanc Zip
            patientOrthancId = patientIdObj[patientId][KEY_ORTHANC_ID]
            query    = URL_ROOT + '/patients/' + patientOrthancId + '/archive'
            response = requests.post(query, data='{"Synchronous":true}', verify=False)
            if response.status_code == 200:
                
                # Step 3 - Extract Zip
                zipContent = response.content
                dcmFilePaths = getDownloadedFilePaths(tmpDirPath, zipContent)
                # print (' - dcmFilePaths: ', dcmFilePaths)
                # pdb.set_trace()

                # Step 4 - Convert dcms to torch arrays
                ctArray       = convertDcmToTorchArray(dcmFilePaths[MODALITY_CT])
                ptArray       = convertDcmToTorchArray(dcmFilePaths[MODALITY_PT])
                maskPredArray = None
                plot(ctArray, ptArray, maskPredArray)

                # Step 5 - z-norm and concat data [CT, PET, Seg]

            else:
                print (' - [downloadPatientZip()] response: ', response.status_code, response.reason)

    except:
        traceback.print_exc()
        pdb.set_trace()

if __name__ == '__main__':

    try:
        
        # Step 1 - Get Orthanc Patient IDs
        patientIdObj = getOrthancPatientIds()
        # print (' - patientIds: ', patientIdObj) # {'CHMR001': KEY_ORTHANC_ID: '8c9400a8-e7942cc9-a453c142-9e072032-b158df2e', 'KEY_STUDIES_ORTHANC_ID': ''}
        pprint.pprint(patientIdObj)


        patientIdForDownload = None
        if 0:
            patientIdForDownload = 'CHMR001'
        
        if patientIdForDownload is not None:
            downloadPatientZip(patientIdForDownload, patientIdObj)
        

    except:
        traceback.print_exc()
        pdb.set_trace()



"""
// Make a curl request to localhost/patients
curl -X GET http://localhost:8042/patients

(ProstateX-0004)
curl -X GET http://localhost:8042/patients/b50780c0-21be0a34-3afd9d9e-e634aab6-61587b01
curl -X GET http://localhost:8042/studies/57577cc2-ce11a485-dc362647-57d39710-a5c8d4af

(HCAI-Interactive-XX)
curl -X GET http://localhost:8042/patients/42326a00-75df2637-b035c6ff-81927a0f-4af82587
curl -X GET http://localhost:8042/studies/937e2902-fd2d68cb-bd55de21-4da47523-65706f05
curl -X GET http://localhost:8042/series/d1682049-00cbdd91-16548797-5639007a-2eefe3b4

(CHMR-001)
curl -X GET http://localhost:8042/instances/8ba755b5-103b0834-405c40bd-b39e565c-6c97268d
"""
