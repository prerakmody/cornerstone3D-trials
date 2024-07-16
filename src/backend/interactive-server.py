import os
import pdb
import time
import json
import psutil
import logging
import warnings
import platform
import datetime
import traceback
import setproctitle
import numpy as np
from pathlib import Path

import matplotlib.colors
import skimage.morphology
import matplotlib.pyplot as plt

import pydicom
import pydicom_seg
import SimpleITK as sitk

import copy
import typing
import fastapi
import uvicorn
import pydantic
import starlette
import fastapi.middleware.cors
import starlette.middleware.sessions
from contextlib import asynccontextmanager

import threading
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

import pydicom
import requests
import pydicom_seg
import dicomweb_client

import torch
import monai
import scipy.ndimage

######################## KEYS ########################

# Keys - DICOM
KEY_STUDY_INSTANCE_UID  = 'StudyInstanceUID'
KEY_SERIES_INSTANCE_UID = 'SeriesInstanceUID'
KEY_SOP_INSTANCE_UID    = 'SOPInstanceUID'
KEY_WADO_RS_ROOT        = 'wadoRsRoot'

# Keys - Model load
KEY_MODEL_STATE_DICT = 'model_state_dict'
EPOCH_STR            = 'epoch_{:04d}'

# Keys - Input + session-data json
KEY_DATA                 = 'data'
KEY_TORCH_DATA           = 'torchData'
KEY_CLIENT_IDENTIFIER    = 'clientIdentifier'
KEY_DCM_LIST             = 'dcmList'
KEY_SCRIBBLE_COUNTER     = 'scribbleCounter'
KEY_DATETIME             = 'dateTime'
KEY_PATH_SAVE            = 'pathSave'
KEY_SEG_ARRAY_GT         = 'segArrayGT'
KEY_SEG_SOP_INSTANCE_UID    = 'segSOPInstanceUID'
KEY_SEG_SERIES_INSTANCE_UID = 'segSeriesInstanceUID'
KEY_SEG_ORTHANC_ID          = 'segOrthancID'


KEY_SCRIBBLE_TYPE = 'scribbleType'
KEY_SCRIBBLE_FGD = 'fgd'
KEY_SCRIBBLE_BGD = 'bgd'
KEY_POINTS_3D    = 'points3D'

# Keys - For DICOM server
KEY_CASE_NAME          = 'caseName'
KEY_SEARCH_OBJ_CT      = 'searchObjCT'
KEY_SEARCH_OBJ_PET     = 'searchObjPET'
KEY_SEARCH_OBJ_RTSGT   = 'searchObjRTSGT'
KEY_SEARCH_OBJ_RTSPRED = 'searchObjRTSPred'

# Keys - For response json
KEY_STATUS = 'status'
KEY_RESPONSE_DATA = 'responseData'

# Keys - For saving
fileNameForSave = lambda name, counter, viewType, sliceId: '-'.join([str(name), SERIESDESC_SUFFIX_REFINE, str(counter), viewType, 'slice{:03d}'.format(sliceId)])

# Key - for views
KEY_AXIAL    = 'Axial'
KEY_CORONAL  = 'Coronal'
KEY_SAGITTAL = 'Sagittal'

# Keys - for colors
COLORSTR_RED   = 'red'
COLORSTR_GREEN = 'green'
COLORSTR_PINK  = 'pink'
COLORSTR_GRAY  = 'gray'
SAVE_DPI = 200
######################## User-defined settings ########################

# Settings - Python server
HOST       = 'localhost'
PORT       = 55000
MODE_DEBUG = True

# Settings - Model Input
SHAPE_TENSOR  = (1, 5, 144, 144, 144)
HU_MIN, HU_MAX   = -250, 250
SUV_MIN, SUV_MAX = 0   ,25000

# Settings - Model Type
KEY_UNET_V1          = 'unet_v1'

# Settings - Distance Map
DISTMAP_Z = 3
DISTMAP_SIGMA = 0.005

# Settings - Paths and filenames
DIR_THIS        = Path(__file__).parent.absolute() # <root>/src/backend/
DIR_SRC         = DIR_THIS.parent.absolute() # <root>/src/
DIR_ASSETS      = DIR_SRC / 'assets/'
DIR_MAIN        = DIR_SRC.parent.absolute() # <root>/
DIR_MODELS      = DIR_MAIN / '_models/'
DIR_EXPERIMENTS = DIR_MAIN / '_experiments/'

FILENAME_PATIENTS_UUIDS_JSON = 'patients-uuids.json'
FILENAME_METAINFO_SEG_JSON   = 'metainfo-segmentation.json'
SERIESDESC_SUFFIX_REFINE     = 'Series-SEG-Refine'
CREATORNAME_REFINE           = 'Modys Refinement model: ' + str(KEY_UNET_V1)
SERIESNUM_REFINE             = 5
SUFIX_REFINE                 = 'Refine'

#################################################################
#                             UTILS
#################################################################

def configureFastAPIApp(app):
    
    # app.add_middleware(starlette.middleware.sessions.SessionMiddleware, secret_key="your-secret-key")
    origins = [f"http://localhost:{port}" for port in range(49000, 60000)]  # Replace with your range of ports
    app.add_middleware(
        fastapi.middleware.cors.CORSMiddleware,
        # allow_origins=["*"],  # Allows all origins
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],  # Allows all methods
        allow_headers=["*"],  # Allows all headers
    )

    return app

def getTorchDevice():
    device = torch.device('cpu')
    if platform.system() == 'Darwin':
        if torch.backends.mps.is_available(): device = torch.device('mps')
    elif platform.system() in ['Linux', 'Windows']:
        if torch.backends.cuda.is_available(): device = torch.device('cuda')
    else:
        print (' - Unknown platform: {}'.format(platform.system()))

    # print ('\n - Device: {}\n'.format(device))

    return device

def getMemoryUsage():

    pid  = os.getpid()
    proc = psutil.Process(pid)
    ramUsageInMB  = proc.memory_info().rss / 1024 / 1024 # in MB
    ramUsageInGB  = ramUsageInMB / 1024 # in GB

    if platform.system() == 'Darwin': # need to redo this for MacOS
        gpuUsageInMB = proc.memory_info().vms / 1024 / 1024

    gpuUsageInGB = gpuUsageInMB / 1024   
    
    print (' ** [{}] Memory usage: RAM ({:.2f} GB), GPU ({:.2f} GB)'.format(pid, ramUsageInGB, gpuUsageInGB))

def getRequestInfo(request):
    userAgent = request.headers.get('user-agent', 'userAgentIsNone')
    referer   = request.headers.get('referer', 'refererIsNone')
    return userAgent, referer

#################################################################
#                        DATA MODELS
#################################################################


class SearchObj(pydantic.BaseModel):
    StudyInstanceUID: str = pydantic.Field(...)
    SeriesInstanceUID: str = pydantic.Field(...)
    SOPInstanceUID: str = pydantic.Field(...)
    wadoRsRoot: str = pydantic.Field(...)

class PreparedData(pydantic.BaseModel):
    searchObjCT: SearchObj = pydantic.Field(...)
    searchObjPET: SearchObj = pydantic.Field(...)
    searchObjRTSGT: SearchObj = pydantic.Field(...)
    searchObjRTSPred: SearchObj = pydantic.Field(...)
    caseName: str = pydantic.Field(...)

class PayloadPrepare(pydantic.BaseModel):
    data: PreparedData = pydantic.Field(...)
    identifier: str = pydantic.Field(...)

class ProcessData(pydantic.BaseModel):
    points3D: typing.List[typing.Tuple[int, int, int]] = pydantic.Field(...)
    scribbleType: str = pydantic.Field(...)
    caseName: str = pydantic.Field(...)

class PayloadProcess(pydantic.BaseModel):
    data: ProcessData = pydantic.Field(...)
    identifier: str = pydantic.Field(...)

#################################################################
#                        NNET MODELS
#################################################################

def getModel(modelName, device=None):

    model = None

    try:

        # Step 1 - Get neural arch

        ###################### RECONSTRUCTION MODELS ######################
        if modelName == KEY_UNET_V1:
            # https://docs.monai.io/en/stable/networks.html#unet
            model = monai.networks.nets.UNet(in_channels=5, out_channels=1, spatial_dims=3, channels=[16, 32, 64, 128], strides=[2, 2, 2], num_res_units=2) # [CT,PET,Pred,Fgd,Bgd] --> [Refined-Pred] # 1.2M params

        # Step 2 - Move to device
        if device is not None:
            model = model.to(device)

    except:
        traceback.print_exc()
        pdb.set_trace()
    
    return model

def loadModel(modelPath, modelName=None, model=None, device=None):
    
    loadedModel = None

    try:

        # Step 1 - Get model
        if model is None and modelName is not None:
            model = getModel(modelName)

        # Step 2 - Load the model
        checkpoint = None
        if model is not None:

            # Step 2.1 - Get checkpoint
            checkpoint = torch.load(modelPath, map_location=device)

            if KEY_MODEL_STATE_DICT in checkpoint:
                model.load_state_dict(checkpoint[KEY_MODEL_STATE_DICT])
            else:
                model.load_state_dict(checkpoint)
            
            # Step 2.2 - Move to device
            if device is not None:
                loadedModel = model.to(device)

    except:
        traceback.print_exc()
    
    return loadedModel

def loadModelUsingUserPath(device, expNameParam, epochParam, modelTypeParam):

    model = None
    try:

        print ('\n =========================== [loadModelUsingUserPath()] =========================== \n')
    
        # Step 1 - Load model
        getMemoryUsage()
        modelPath = Path(DIR_MODELS) / expNameParam / EPOCH_STR.format(epochParam) / EPOCH_STR.format(epochParam)
        if Path(modelPath).exists():
            print (' - [loadModel()] Loading model from: ', modelPath)
            print (' - [loadModel()] Device: ', device)
            
            model     = loadModel(modelPath, modelTypeParam, device=device)
            if model is not None:
                model.eval()
                _ = model(torch.randn(SHAPE_TENSOR, device=device)) # warm-up
                getMemoryUsage()
            else:
                print (' - [loadModel()] Model not loaded')
                print (' - Exiting...')
                exit(0)
        
            print ('\n =========================== [loadModelUsingUserPath()] =========================== \n')
        
        else:
            print (' - [loadModel()] Model not found at: ', modelPath)
            print (' - Exiting...')
            exit(0)

    except:
        traceback.print_exc()
        pdb.set_trace()
    
    return model

def doInference(model, preparedDataTorch):

    segArrayRefinedNumpy = None
    segArrayRefinedTorch = None
    try:
        if model is not None:
            segArrayRefinedTorch  = model(preparedDataTorch)
            segArrayRefinedTorch  = torch.sigmoid(segArrayRefinedTorch).detach()
            segArrayRefinedTorch[segArrayRefinedTorch <= 0.5] = 0
            segArrayRefinedTorch[segArrayRefinedTorch > 0.5] = 1
            segArrayRefinedNumpy = segArrayRefinedTorch.cpu().numpy()[0,0]

    except:
        traceback.print_exc()
        if MODE_DEBUG: pdb.set_trace()

    return segArrayRefinedTorch, segArrayRefinedNumpy

#################################################################
#                           DCM SERVER
#################################################################

def getDCMClient(wadoRsRoot):
    
    client = None

    try:

        # Step 1 - Init
        client = dicomweb_client.api.DICOMwebClient(url=wadoRsRoot)

    except:
        traceback.print_exc()
    
    return client

def getCTArray(client, patientData):
    
    ctArray, ctArrayProcessed, ctArrayProcessedBool = None, None, False
    patientName = None

    try:

        # Step 0 - Init
        patientName = patientData[KEY_DATA][KEY_CASE_NAME]
        preparedData = patientData[KEY_DATA]

        # Step 1 - Get CT instances
        ctInstances = client.retrieve_series(
            study_instance_uid=preparedData[KEY_SEARCH_OBJ_CT][KEY_STUDY_INSTANCE_UID],
            series_instance_uid=preparedData[KEY_SEARCH_OBJ_CT][KEY_SERIES_INSTANCE_UID]
        )

        # Step 2 - Sort instances
        ctInstances = sorted(ctInstances, key=lambda x: int(x.InstanceNumber))

        # Step 3 - Get CT array
        if len(ctInstances) == 0:
            print (' - [prepare()] No CT instances found')
            return ctArray, patientData
        
        ctArray = np.zeros((len(ctInstances), ctInstances[0].Rows, ctInstances[0].Columns), dtype=np.int16)
        for instance in ctInstances:
            ctArray[:, :, int(instance.InstanceNumber)-1] = instance.pixel_array
        
        # Step 3.1 - Perform min-max crop and then z-normalization
        ctArrayProcessed = np.clip(copy.deepcopy(ctArray), HU_MIN, HU_MAX)
        ctArrayProcessed = (ctArrayProcessed - np.mean(ctArrayProcessed)) / np.std(ctArrayProcessed)

        # Step 4 - Update sessionsGlobal
        thisShapeTensor = list(copy.deepcopy(SHAPE_TENSOR))
        thisShapeTensor[2] = ctArray.shape[0]
        thisShapeTensor[3] = ctArray.shape[1]
        thisShapeTensor[4] = ctArray.shape[2]
        
        patientData[KEY_TORCH_DATA] = torch.zeros(thisShapeTensor, dtype=torch.float32, device=DEVICE)
        patientData[KEY_TORCH_DATA][0, 0, :, :, :] = torch.tensor(ctArrayProcessed, dtype=torch.float32, device=DEVICE)
        patientData[KEY_DCM_LIST] = ctInstances

        ctArrayProcessedBool = True

    except:
        print (' - [getCTArray()] Could not get CT array for patient: ', patientName)
        traceback.print_exc()
    
    return ctArrayProcessedBool, ctArray, ctArrayProcessed, patientData

def getPTArray(client, patientData):
    
    ptArray = None

    try:

        # Step 0 - Init
        preparedData = patientData[KEY_DATA]

        # Step 1 - Get PT instances
        ptInstances = client.retrieve_series(
            study_instance_uid=preparedData[KEY_SEARCH_OBJ_PET][KEY_STUDY_INSTANCE_UID],
            series_instance_uid=preparedData[KEY_SEARCH_OBJ_PET][KEY_SERIES_INSTANCE_UID]
        )

        # Step 2 - Sort instances
        ptInstances = sorted(ptInstances, key=lambda x: int(x.InstanceNumber))

        # Step 3 - Get PT array
        if len(ptInstances) == 0:
            print (' - [prepare()] No PT instances found')
            return ptArray, patientData
        
        ptArray = np.zeros((len(ptInstances), ptInstances[0].Rows, ptInstances[0].Columns), dtype=np.int16)
        for instance in ptInstances:
            ptArray[:, :, int(instance.InstanceNumber)-1] = instance.pixel_array
        
        # Step 3.1 - Perform min-max crop and then z-normalization
        ptArrayProcessed = np.clip(copy.deepcopy(ptArray), SUV_MIN, SUV_MAX)
        ptArrayProcessed = (ptArrayProcessed - np.mean(ptArrayProcessed)) / np.std(ptArray)

        # Step 4 - Update sessionsGlobal
        patientData[KEY_TORCH_DATA][0, 1, :, :, :] = torch.tensor(ptArrayProcessed, dtype=torch.float32, device=DEVICE)
        
    except:
        traceback.print_exc()
    
    return ptArray, ptArrayProcessed, patientData

def getSEGs(client, patientData): # preparedData, sessionsGlobal, clientIdentifier, debug=False):
    
    segArrayGT   = None
    segArrayPred = None

    try:

        # Step 0 - Init
        preparedData = patientData[KEY_DATA]

        # Step 1 - Get SEG-GT instance
        studyInstanceUIDGT = preparedData[KEY_SEARCH_OBJ_RTSGT][KEY_STUDY_INSTANCE_UID]
        if studyInstanceUIDGT != '' and studyInstanceUIDGT != None:

            try:
                segInstanceGT = client.retrieve_instance(
                    study_instance_uid=preparedData[KEY_SEARCH_OBJ_RTSGT][KEY_STUDY_INSTANCE_UID],
                    series_instance_uid=preparedData[KEY_SEARCH_OBJ_RTSGT][KEY_SERIES_INSTANCE_UID],
                    sop_instance_uid=preparedData[KEY_SEARCH_OBJ_RTSGT][KEY_SOP_INSTANCE_UID]
                )

                # Step 1.2 - Read GT array
                reader = pydicom_seg.SegmentReader()
                resultGT = reader.read(segInstanceGT)

                for segment_number in resultGT.available_segments:
                    segArrayGT = resultGT.segment_data(segment_number)  # directly available
                    segArrayGT = np.moveaxis(segArrayGT, [0,1,2], [2,1,0])
                    # NOTE: Dirty hack to make the orientation of the SEG correct 
                    for idx in range(segArrayGT.shape[2]):
                        segArrayGT[:,:,idx] = np.rot90(segArrayGT[:,:,idx], k=1)
                        segArrayGT[:,:,idx] = np.flipud(segArrayGT[:,:,idx])

            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    print (' - [getSEGs(studyUID={})] No SEG-GT instance found'.format(studyInstanceUIDGT))
        
        # Step 2 - Get SEG-Pred instance
        studyInstanceUIDPred = preparedData[KEY_SEARCH_OBJ_RTSPRED][KEY_STUDY_INSTANCE_UID]
        if studyInstanceUIDPred != '' and studyInstanceUIDPred != None:
            try:
                segInstancePred = client.retrieve_instance(
                    study_instance_uid=studyInstanceUIDPred,
                    series_instance_uid=preparedData[KEY_SEARCH_OBJ_RTSPRED][KEY_SERIES_INSTANCE_UID],
                    sop_instance_uid=preparedData[KEY_SEARCH_OBJ_RTSPRED][KEY_SOP_INSTANCE_UID]
                )

                # Step 2.2 - Read Pred array
                reader = pydicom_seg.SegmentReader()
                resultPred = reader.read(segInstancePred)

                for segment_number in resultPred.available_segments:
                    segArrayPred = resultPred.segment_data(segment_number)
                    segArrayPred = np.moveaxis(segArrayPred, [0,1,2], [2,1,0]) # [z,y,x] --> [x,y,z]
                    # NOTE: Dirty hack to make the orientation of the SEG correct
                    for idx in range(segArrayPred.shape[2]):
                        segArrayPred[:,:,idx] = np.rot90(segArrayPred[:,:,idx], k=1)
                        segArrayPred[:,:,idx] = np.flipud(segArrayPred[:,:,idx])
                                
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    print (' - [getSEGs(studyUID={})] No SEG-Pred instance found'.format(studyInstanceUIDPred))
            
        # Step 3 - Update sessionsGlobal
        if segArrayPred is not None:
            patientData[KEY_TORCH_DATA][0, 2, :, :, :] = torch.tensor(segArrayPred, dtype=torch.float32, device=DEVICE)
        
        if segArrayGT is not None:
            patientData[KEY_SEG_ARRAY_GT] = segArrayGT # store as numpy array
        
    except:
        traceback.print_exc()
    
    return segArrayGT, segArrayPred, patientData

def plotHistograms(ctArray, ctArrayProcessed, ptArray, ptArrayProcessed, segArrayGT, segArrayPred, patientName, saveFolderPath):
    
        try:
    
            # Step 1 - Plot histograms
            f,axarr = plt.subplots(3,2, figsize=(10,10))
            axarr[0,0].hist(ctArray.flatten(), bins=100, color='black', alpha=0.5, label='CT')
            axarr[0,0].set_title('CT')
            axarr[0,1].hist(ptArray.flatten(), bins=100, color='black', alpha=0.5, label='PT')
            axarr[0,1].set_title('PT')
            axarr[1,0].hist(ctArrayProcessed.flatten(), bins=100, color='black', alpha=0.5, label='CT-Processed')
            axarr[1,0].set_title('CT-Processed')
            axarr[1,1].hist(ptArrayProcessed.flatten(), bins=100, color='black', alpha=0.5, label='PT-Processed')
            axarr[1,1].set_title('PT-Processed')
            axarr[2,0].hist(segArrayGT.flatten(), bins=100, color='black', alpha=0.5, label='SEG-GT')
            axarr[2,0].set_title('SEG-GT')
            axarr[2,1].hist(segArrayPred.flatten(), bins=100, color='black', alpha=0.5, label='SEG-Pred')
            axarr[2,1].set_title('SEG-Pred')
            plt.suptitle(patientName)

            Path(saveFolderPath).mkdir(parents=True, exist_ok=True)
            plt.savefig(str(Path(saveFolderPath).joinpath(patientName + '_histograms.png')), bbox_inches='tight')
    
        except:
            traceback.print_exc()
            if MODE_DEBUG: pdb.set_trace()

def postInstanceToOrthanc(requestBaseURL, dcmPath):

    postDICOMStatus = False
    instanceOrthanID = None
    postInstanceStatus = ''

    try:
        sendInstanceURL = requestBaseURL + '/instances'
        with open(dcmPath, 'rb') as file:
            dcmPathContent     = file.read()
            sendResponse       = requests.post(sendInstanceURL, data=dcmPathContent)
            postInstanceStatus = sendResponse.json()['Status'] # ['Success', 'AlreadyStored']
            if sendResponse.status_code == 200:
                instanceOrthanID = sendResponse.json()['ID']
                postDICOMStatus = True
            elif sendResponse.status_code == 404:
                print (' - [makeSEGDicom()] Could not post instance: ', sendResponse.text)
                if MODE_DEBUG: pdb.set_trace()
            else:
                print (' - [makeSEGDicom()] Could not post instance: ', sendResponse.text)
                if MODE_DEBUG: pdb.set_trace()
                
    except:
        traceback.print_exc()
        print (' - [makeSEGDicom()] Could not post instance')
    
    return postDICOMStatus, instanceOrthanID, postInstanceStatus

def deleteInstanceFromOrthanc(requestBaseURL, instanceOrthanID):

    deleteInstanceStatus = False

    try:
        deleteInstanceURL = requestBaseURL + '/instances/' + str(instanceOrthanID)
        deleteResponse = requests.delete(deleteInstanceURL)
        if deleteResponse.status_code == 404:
            print (' - [makeSEGDicom()] Instance not found: ', deleteInstanceURL)
            pass # instance not found
        if deleteResponse.status_code == 200:
            # print (' - [makeSEGDicom()] Instance deleted')
            deleteInstanceStatus = True
            pass # instance deleted
    except:
        traceback.print_exc()
        print (' - [makeSEGDicom()] Could not delete instance')
    
    return deleteInstanceStatus

def makeSEGDicom(maskArray, patientSessionData, viewType, sliceId):
    """
    Params
    ------
    maskArray: np.ndarray, [H,W,Depth]
    """

    makeDICOMStatus = False
    try:

        if 1:
            # Step 0 - Init
            def set_segment_color(ds, segment_index, rgb_color):

                def rgb_to_cielab(rgb):
                    import skimage
                    import skimage.color
                    # Normalize RGB values to the range 0-1
                    rgb_normalized = np.array(rgb) / 255.0
                    # Convert RGB to CIELab
                    cielab = skimage.color.rgb2lab(np.array([rgb_normalized]))
                    return cielab.flatten()
                
                # Convert RGB to DICOM CIELab
                cielab = rgb_to_cielab(rgb_color)
                # DICOM CIELab values need to be scaled and converted to unsigned 16-bit integers
                L_star = int((cielab[0] / 100) * 65535)  # L* from 0 to 100
                a_star = int(((cielab[1] + 128) / 255) * 65535)  # a* from -128 to +127
                b_star = int(((cielab[2] + 128) / 255) * 65535)  # b* from -128 to +127
                
                # Set the color for the specified segment
                if 'SegmentSequence' in ds:
                    segment = ds.SegmentSequence[segment_index]
                    segment.RecommendedDisplayCIELabValue = [L_star, a_star, b_star]
                
                # Save the modified DICOM file
                return ds

            floatify = lambda x: [float(each) for each in x] 
            patientName       = patientSessionData[KEY_DATA][KEY_CASE_NAME]
            ctDicomsList      = patientSessionData[KEY_DCM_LIST]
            pathFolderMask    = patientSessionData[KEY_PATH_SAVE]
            counter           = patientSessionData[KEY_SCRIBBLE_COUNTER]
            sopInstanceUID    = patientSessionData[KEY_SEG_SOP_INSTANCE_UID]
            seriesInstanceUID = patientSessionData[KEY_SEG_SERIES_INSTANCE_UID]

            # Step 1 - Convert to sitk image
            dsCT        = ctDicomsList[0]
            maskSpacing = floatify(dsCT.PixelSpacing) + [float(dsCT.SliceThickness)]
            maskOrigin  = floatify(dsCT.ImagePositionPatient)
            if 0:
                sliceId = 72
                f,axarr = plt.subplots(1,3)
                axarr[0].imshow(maskArray[:,:,sliceId], cmap='gray'); axarr[0].set_title('maskArray[:,:,{}]'.format(sliceId))
                axarr[1].imshow(np.moveaxis(maskArray, [0,1,2], [2,1,0])[sliceId,:,:], cmap='gray'); axarr[1].set_title('np.moveaxis(maskArray, [0,1,2], [2,1,0])[sliceId,:,:]')
                axarr[2].imshow(np.moveaxis(maskArray, [0,1,2], [1,2,0])[sliceId,:,:], cmap='gray'); axarr[2].set_title('np.moveaxis(maskArray, [0,1,2], [1,2,0])[sliceId,:,:]')
                plt.show()

            maskArrayCopy = copy.deepcopy(maskArray)
            for idx in range(maskArrayCopy.shape[2]):
                maskArrayCopy[:,:,idx] = np.flipud(maskArrayCopy[:,:,idx])
                maskArrayCopy[:,:,idx] = np.rot90(maskArrayCopy[:,:,idx], k=3)
                
            maskArrayForImage = np.moveaxis(maskArrayCopy, [0,1,2], [2,1,0]); # print (" - Doing makeSEGDICOM's np.moveaxis() as always") # np([H,W,D]) -> np([D,W,H]) -> sitk([H,W,D])
            maskImage   = sitk.GetImageFromArray(maskArrayForImage.astype(np.uint8)) # np([H,W,D]) -> np([D,W,H]) -> sitk([H,W,D])
            maskImage.SetSpacing(maskSpacing)
            maskImage.SetOrigin(maskOrigin)
            
            # Step 2 - Create a basic dicom dataset        
            template                    = pydicom_seg.template.from_dcmqi_metainfo(Path(DIR_ASSETS) / FILENAME_METAINFO_SEG_JSON)
            if MODE_DEBUG:
                template.SeriesDescription  = fileNameForSave(patientName, counter, str(viewType), int(sliceId))  # '-'.join([patientName, SERIESDESC_SUFFIX_REFINE, str(counter)])
            else:
                template.SeriesDescription  = '-'.join([patientName, SERIESDESC_SUFFIX_REFINE, Path(pathFolderMask).parts[-1], str(counter)])
            template.SeriesNumber       = SERIESNUM_REFINE
            template.ContentCreatorName = CREATORNAME_REFINE
            # template.ContentLabel       = maskType
            writer                      = pydicom_seg.MultiClassWriter(template=template, inplane_cropping=False, skip_empty_slices=False, skip_missing_segment=False)
            dcm                         = writer.write(maskImage, ctDicomsList)
            # print (' - rows: {} | cols: {} | numberofframes:{}'.format(dcm.Rows, dcm.Columns, dcm.NumberOfFrames))
            
            # Step 3 - Save the dicom file
            set_segment_color(dcm, 0, [255, 192, 203]) # pink
            dcm.StudyInstanceUID        = dsCT.StudyInstanceUID
            dcm.SeriesInstanceUID       = seriesInstanceUID
            dcm.SOPInstanceUID          = sopInstanceUID
            Path(pathFolderMask).mkdir(parents=True, exist_ok=True)
            dcmPath = str(Path(pathFolderMask).joinpath('-'.join([patientName, SUFIX_REFINE, str(counter)]) + '.dcm'))
            dcm.save_as(dcmPath)
            print (' - [makeSEGDicom()] Saving SEG with SeriesDescription: ', dcm.SeriesDescription)
        
        # Step 4 - Post to DICOM server
        if 1:
            instanceOrthancID = patientSessionData[KEY_SEG_ORTHANC_ID]
            global DCMCLIENT
            if DCMCLIENT is not None:
                requestBaseURL = str(DCMCLIENT.protocol) + '://' + str(DCMCLIENT.host) + ':' + str(DCMCLIENT.port)

                if instanceOrthancID is None:
                    print (' - [makeSEGDicom()] First AI scribble for this patient. Posting SEG to DICOM server')
                    postDICOMStatus, instanceOrthancID, postInstanceStatus = postInstanceToOrthanc(requestBaseURL, dcmPath)
                    if postDICOMStatus:
                        if postInstanceStatus == 'AlreadyStored':
                            deleteInstanceStatus = deleteInstanceFromOrthanc(requestBaseURL, instanceOrthancID)
                            if deleteInstanceStatus:
                                postDICOMStatus, instanceOrthancID, postInstanceStatus = postInstanceToOrthanc(requestBaseURL, dcmPath)
                                if postDICOMStatus:
                                    patientSessionData[KEY_SEG_ORTHANC_ID] = instanceOrthancID # this is so that the dicom data is not crowded. Only the latest instance is stored
                                    makeDICOMStatus = True
                        else:
                            makeDICOMStatus = True
                    else:
                        print (' - [makeSEGDicom()] Could not post SEG to DICOM server')
                
                elif instanceOrthancID is not None:
                    # print (' - [makeSEGDicom()] >1 AI scribble for this patient. Deleting existing SEG and posting new SEG to DICOM server')
                    deleteInstanceStatus = deleteInstanceFromOrthanc(requestBaseURL, instanceOrthancID)
                    if deleteInstanceStatus:
                        postDICOMStatus, instanceOrthancID, postInstanceStatus = postInstanceToOrthanc(requestBaseURL, dcmPath)
                        if postDICOMStatus:
                            patientSessionData[KEY_SEG_ORTHANC_ID] = instanceOrthancID
                            makeDICOMStatus = True
                    else:
                        print (' - [makeSEGDicom()] Could not delete existing SEG from DICOM server')

            else:
                print (' - [makeSEGDicom()] DCMCLIENT is None. Not posting SEG to DICOM server')

    except:
        traceback.print_exc()
        if MODE_DEBUG: pdb.set_trace()

    return makeDICOMStatus, patientSessionData

def getPatientUUIDs(patientID):

    seriesInstanceUUID = None
    sopInstanceUUID    = None
    try:
        # Step 0 - Init
        pathPatientsUUIDJson = DIR_ASSETS / FILENAME_PATIENTS_UUIDS_JSON
        Path(pathPatientsUUIDJson.parent).mkdir(parents=True, exist_ok=True)
        if not Path(pathPatientsUUIDJson).exists():
            with open(pathPatientsUUIDJson, 'w') as fp:
                json.dump({}, fp, indent=4)
        
        # Step 1.1 - Get data (if it exists)
        patientsUUIDs = {}
        with open(pathPatientsUUIDJson, 'r') as fp:
            patientsUUIDs = json.load(fp)

            # Step 1 - Get patient UUIDs
            if patientID in patientsUUIDs:
                seriesInstanceUUID = patientsUUIDs[patientID].get(KEY_SERIES_INSTANCE_UID, None)
                sopInstanceUUID    = patientsUUIDs[patientID].get(KEY_SOP_INSTANCE_UID, None)
            else:
                print (' - [getPatientUUIDs()] No patient found with patientID: ', patientID)

        # Step 2 - Make data (if it does not exist)
        if seriesInstanceUUID == None or sopInstanceUUID == None:
            seriesInstanceUUID, sopInstanceUUID = str(pydicom.uid.generate_uid()), str(pydicom.uid.generate_uid())
            with open(pathPatientsUUIDJson, 'w') as fp:
                patientsUUIDs[patientID] = {KEY_SERIES_INSTANCE_UID: seriesInstanceUUID, KEY_SOP_INSTANCE_UID: sopInstanceUUID}
                json.dump(patientsUUIDs, fp, indent=4)

    except:
        traceback.print_exc()
        pdb.set_trace()
    
    return seriesInstanceUUID, sopInstanceUUID

#################################################################
#                        DIST MAP UTILS
#################################################################

def getViewTypeAndSliceId(points3D):

    viewType = None
    sliceId = None
    try:
        
        for viewIdx in [0,1,2]:
            points3DAtIdx = points3D[:,viewIdx]
            if np.unique(points3DAtIdx).shape[0] == 1:
                if viewIdx == 0:
                    viewType = KEY_SAGITTAL
                elif viewIdx == 1:
                    viewType = KEY_CORONAL
                elif viewIdx == 2:
                    viewType = KEY_AXIAL
                sliceId = points3DAtIdx[0]
                break

            # if points3D[0][viewIdx] == points3D[1][viewIdx] == points3D[-1][viewIdx] == points3D[-2][viewIdx]:
            #     if viewIdx == 0: 
            #         viewType = KEY_SAGITTAL
            #     elif viewIdx == 1: 
            #         viewType = KEY_CORONAL
            #     elif viewIdx == 2: 
            #         viewType = KEY_AXIAL
            #     sliceId = points3D[0][viewIdx]

    except:
        traceback.print_exc()
        if MODE_DEBUG: pdb.set_trace()
    
    return viewType, sliceId

def getScribbleColorMap(cmap, opacityBoolForScribblePoints):

    cmapNew, normNew = None, None
    
    try:
        
        # Step 1 - Get colors
        import matplotlib.colors
        colors = cmap(np.arange(cmap.N)) # cmap accepts values in the range: [0,256]

        # Step 2.1 - Set opacity
        colors[:,-1] = np.linspace(0, 1, cmap.N)

        # Step 2.2 - Set opacity to 0 for all colors, except the last one
        if opacityBoolForScribblePoints:
            colors[:,-1][:-1] = 0 # set opacity to 0 for all colors, except the last one
        
        # Step 3 - Create new colormap
        cmapNew = matplotlib.colors.ListedColormap(colors)

        # Step 4 - Normalize
        normNew = matplotlib.colors.BoundaryNorm(np.linspace(0, 1, cmap.N), cmap.N, clip=True)

    except:
        traceback.print_exc()
        if MODE_DEBUG: pdb.set_trace()
    
    return cmapNew, normNew

def getGaussianDistanceMap(ctArray, points3D, distZ, sigma):

    gaussianDistanceMap = None
    viewType, sliceId = None, None
    try:
        
        # Step 0 - Identify viewType and sliceID
        viewType, sliceId = getViewTypeAndSliceId(points3D)
        if viewType is None or sliceId is None:
            return gaussianDistanceMap

        # Step 1 - Put points3D in an array
        points3DInVolume = np.zeros_like(ctArray)
        # points3DInVolume[points3D[:,0], points3D[:,1], points3D[:,2]] = 1
        points3DInVolume[points3D[:,1], points3D[:,0], points3D[:,2]] = 1

        # Step 2 - Get distance map
        if viewType == KEY_AXIAL     : sampling = (1,1,distZ)
        elif viewType == KEY_SAGITTAL: sampling = (distZ,1,1)
        elif viewType == KEY_CORONAL : sampling = (1,distZ,1)
        euclideanDistanceMap = scipy.ndimage.distance_transform_edt(1-points3DInVolume, sampling=sampling)
        maxVal               = euclideanDistanceMap.max()
        euclideanDistanceMap = 1 - (euclideanDistanceMap / maxVal)
        
        # Step 2 - Get gaussian distance map
        gaussianDistanceMap = np.exp(-(1-euclideanDistanceMap)**2 / (2 * sigma**2))

    except:
        traceback.print_exc()
        if MODE_DEBUG: pdb.set_trace()
    
    return gaussianDistanceMap, viewType, sliceId

def getDistanceMap(preparedDataTorch, scribbleType, points3D, distMapZ, distMapSigma):

    try:
        
        ctArray        = np.array(preparedDataTorch[0,0])
        fgdMap, bgdMap = np.zeros_like(ctArray), np.zeros_like(ctArray)
        if scribbleType == KEY_SCRIBBLE_FGD:
            fgdMap, viewType, sliceId = getGaussianDistanceMap(ctArray, points3D, distZ=distMapZ, sigma=distMapSigma)
            preparedDataTorch[0,3] = torch.tensor(fgdMap, dtype=torch.float32, device=DEVICE)
        elif scribbleType == KEY_SCRIBBLE_BGD:
            bgdMap, viewType, sliceId = getGaussianDistanceMap(ctArray, points3D, distZ=distMapZ, sigma=distMapSigma)
            preparedDataTorch[0,4] = torch.tensor(bgdMap, dtype=torch.float32, device=DEVICE)
        else:
            print (' - [process()] Unknown scribbleType: {}'.format(scribbleType))

    except:
        traceback.print_exc()
        if MODE_DEBUG: pdb.set_trace()
    
    return preparedDataTorch, viewType, sliceId

def plotData(ctArray, ptArray, gtArray, predArray, refineArray=None, sliceId=None, caseName='', counter=0, points3D=None, scribbleType=None, extraSlices=7, saveFolderPath=False):
    """
    Params
    ------
    ctArray, ptArray, gtArray, predArray, refineArray: np.ndarray, [H,W,depth]
    """
    try:

        import matplotlib.colors
        import skimage.morphology
        import matplotlib.pyplot as plt
        warnings.filterwarnings("ignore", category=UserWarning)

        # Step 0 - Define constants
        rotAxial    = lambda x: x
        rotSagittal = lambda x: np.rot90(x, k=1)
        rotCoronal  = lambda x: np.rot90(x, k=1)

        CMAP_DEFAULT      = plt.cm.Oranges
        RGBA_ARRAY_BLUE   = np.array([0   ,0 ,255,255])/255.
        RGBA_ARRAY_YELLOW = np.array([218,165,32 ,255])/255.

        # Step 0 - Identify viewType and sliceID
        points3DDistanceMap = None
        viewType = None
        if points3D is not None:
            points3DDistanceMap, viewType, sliceId = getGaussianDistanceMap(ctArray, points3D, distZ=DISTMAP_Z, sigma=DISTMAP_SIGMA)
                    
        # Step 1 - Set up figure
        rows = 3
        columns = 2
        extraSliceIdsAndColumnIds = []
        if points3D is not None:
            columns += extraSlices # +3,-3 slices for each view
            for sliceDelta in range(-extraSlices//2+1, extraSlices//2+1):
                sliceNeighborId = sliceId + sliceDelta
                columnId        = 2 + extraSlices//2 + sliceDelta
                if sliceNeighborId >= 0 and sliceNeighborId < ctArray.shape[2]:
                    extraSliceIdsAndColumnIds.append((sliceNeighborId, columnId))
        if extraSlices > 0 or extraSlices is not None:
            f,axarr = plt.subplots(3,columns, figsize=(30, 8))
        else:
            f,axarr = plt.subplots(3,2)
        plt.subplots_adjust(left=0.1,bottom=0.1, right=0.9, top=0.9, wspace=0.05, hspace=0.05)
        
        # Step 2 - Show different views (Axial/Sagittal/Coronal)
        if 1:

            # Step 2.1 - Axial slice
            axarr[0,0].set_ylabel('Axial')
            axarr[0,0].imshow(ctArray[:, :, sliceId], cmap=COLORSTR_GRAY)
            axarr[0,1].imshow(ptArray[:, :, sliceId], cmap=COLORSTR_GRAY)
            if gtArray is not None:
                axarr[0,0].contour(gtArray[:, :, sliceId], colors=COLORSTR_GREEN)
                axarr[0,1].contour(gtArray[:, :, sliceId], colors=COLORSTR_GREEN)
            if predArray is not None:
                axarr[0,0].contour(predArray[:, :, sliceId], colors=COLORSTR_RED)
                axarr[0,1].contour(predArray[:, :, sliceId], colors=COLORSTR_RED)
            if refineArray is not None:
                axarr[0,0].contour(refineArray[:, :, sliceId], colors=COLORSTR_PINK, linestyle='dotted', linewidths=1)
                axarr[0,1].contour(refineArray[:, :, sliceId], colors=COLORSTR_PINK, linestyle='dotted', linewidths=1)
            for (sliceNeighborId, columnId) in extraSliceIdsAndColumnIds:
                axarr[0,columnId].imshow(ctArray[:, :, sliceNeighborId], cmap=COLORSTR_GRAY)
                axarr[0,columnId].imshow(ptArray[:, :, sliceNeighborId], cmap=COLORSTR_GRAY, alpha=0.3)
                if gtArray is not None:
                    axarr[0,columnId].contour(gtArray[:, :, sliceNeighborId], colors=COLORSTR_GREEN)
                if predArray is not None:
                    axarr[0,columnId].contour(predArray[:, :, sliceNeighborId], colors=COLORSTR_RED)
                if refineArray is not None:
                    axarr[0,columnId].contour(refineArray[:, :, sliceNeighborId], colors=COLORSTR_PINK, linestyle='dotted', linewidths=1)
                axarr[0,columnId].set_title('Slice: {}'.format(sliceNeighborId+1))
            
            # Step 2.2 - Sagittal slice
            axarr[1,0].set_ylabel('Sagittal')
            axarr[1,0].imshow(rotSagittal(ctArray[:, sliceId, :]), cmap=COLORSTR_GRAY)
            axarr[1,1].imshow(rotSagittal(ptArray[:, sliceId, :]), cmap=COLORSTR_GRAY)
            if gtArray is not None:
                axarr[1,0].contour(rotSagittal(gtArray[:, sliceId, :]), colors=COLORSTR_GREEN)
                axarr[1,1].contour(rotSagittal(gtArray[:, sliceId, :]), colors=COLORSTR_GREEN)
            if predArray is not None:
                axarr[1,0].contour(rotSagittal(predArray[:, sliceId, :]), colors=COLORSTR_RED)
                axarr[1,1].contour(rotSagittal(predArray[:, sliceId, :]), colors=COLORSTR_RED)
            if refineArray is not None:
                axarr[1,0].contour(rotSagittal(refineArray[:, sliceId, :]), colors=COLORSTR_PINK, linestyle='dashed')
                axarr[1,1].contour(rotSagittal(refineArray[:, sliceId, :]), colors=COLORSTR_PINK, linestyle='dashed')
            for (sliceNeighborId, columnId) in extraSliceIdsAndColumnIds:
                axarr[1,columnId].imshow(rotSagittal(ctArray[:, sliceNeighborId, :]), cmap=COLORSTR_GRAY)
                axarr[1,columnId].imshow(rotSagittal(ptArray[:, sliceNeighborId, :]), cmap=COLORSTR_GRAY, alpha=0.3)
                if gtArray is not None:
                    axarr[1,columnId].contour(rotSagittal(gtArray[:, sliceNeighborId, :]), colors=COLORSTR_GREEN)
                if predArray is not None:
                    axarr[1,columnId].contour(rotSagittal(predArray[:, sliceNeighborId, :]), colors=COLORSTR_RED)
                if refineArray is not None:
                    axarr[1,columnId].contour(rotSagittal(refineArray[:, sliceNeighborId, :]), colors=COLORSTR_PINK, linestyle='dotted', linewidths=1)

            # Step 2.3 - Coronal slice
            axarr[2,0].set_ylabel('Coronal')
            axarr[2,0].imshow(rotCoronal(ctArray[sliceId, :, :]), cmap=COLORSTR_GRAY)
            axarr[2,1].imshow(rotCoronal(ptArray[sliceId, :, :]), cmap=COLORSTR_GRAY)
            if gtArray is not None:
                axarr[2,0].contour(rotCoronal(gtArray[sliceId, :, :]), colors=COLORSTR_GREEN)
                axarr[2,1].contour(rotCoronal(gtArray[sliceId, :, :]), colors=COLORSTR_GREEN)
            if predArray is not None:
                axarr[2,0].contour(rotCoronal(predArray[sliceId, :, :]), colors=COLORSTR_RED)
                axarr[2,1].contour(rotCoronal(predArray[sliceId, :, :]), colors=COLORSTR_RED)
            if refineArray is not None:
                axarr[2,0].contour(rotCoronal(refineArray[sliceId, :, :]), colors=COLORSTR_PINK, linestyle='dashed')
                axarr[2,1].contour(rotCoronal(refineArray[sliceId, :, :]), colors=COLORSTR_PINK, linestyle='dashed')
            for (sliceNeighborId, columnId) in extraSliceIdsAndColumnIds:
                axarr[2,columnId].imshow(rotCoronal(ctArray[sliceNeighborId, :, :]), cmap=COLORSTR_GRAY)
                axarr[2,columnId].imshow(rotCoronal(ptArray[sliceNeighborId, :, :]), cmap=COLORSTR_GRAY, alpha=0.3)
                if gtArray is not None:
                    axarr[2,columnId].contour(rotCoronal(gtArray[sliceNeighborId, :, :]), colors=COLORSTR_GREEN)
                if predArray is not None:
                    axarr[2,columnId].contour(rotCoronal(predArray[sliceNeighborId, :, :]), colors=COLORSTR_RED)
                if refineArray is not None:
                    axarr[2,columnId].contour(rotCoronal(refineArray[sliceNeighborId, :, :]), colors=COLORSTR_PINK, linestyle='dotted', linewidths=1)
        
        # Step 3 - Show distance map
        if 1:
            if points3DDistanceMap is not None:
                
                # Step 3.1 - Get colormaps
                if scribbleType == KEY_SCRIBBLE_FGD:
                    scribbleColor = RGBA_ARRAY_YELLOW
                    scribbleColorStr = 'yellow'
                elif scribbleType == KEY_SCRIBBLE_BGD:
                    scribbleColor = RGBA_ARRAY_BLUE
                    scribbleColorStr = 'blue'
                scribbleColorMapBase = matplotlib.colors.ListedColormap([scribbleColor for _ in range(256)])
                scribbleColorMap, scribbleNorm = getScribbleColorMap(scribbleColorMapBase, opacityBoolForScribblePoints=True)
                cmapScribbleDist, normScribbleDist = getScribbleColorMap(CMAP_DEFAULT, opacityBoolForScribblePoints=False)

                # Step 3.2 - Get binary distance map
                points3DDistanceMapBinary = copy.deepcopy(points3DDistanceMap)
                points3DDistanceMapBinary[points3DDistanceMapBinary < 1] = 0

                if viewType == KEY_AXIAL:
                    axial2DSlice = skimage.morphology.binary_dilation(points3DDistanceMapBinary[:, :, sliceId])
                    axarr[0,0].imshow(axial2DSlice, cmap=scribbleColorMap, norm=scribbleNorm)
                    axarr[0,1].imshow(axial2DSlice, cmap=scribbleColorMap, norm=scribbleNorm)
                    # axial2DSlice = points3DDistanceMapBinary[:, :, sliceId]
                    # axarr[0,0].contour(axial2DSlice, color=scribbleColorStr)
                    # axarr[0,1].contour(axial2DSlice, color=scribbleColorStr)
                    for (sliceNeighborId, columnId) in extraSliceIdsAndColumnIds:
                        axarr[0,columnId].imshow(points3DDistanceMap[:, :, sliceNeighborId], cmap=cmapScribbleDist, norm=normScribbleDist)
                elif viewType == KEY_SAGITTAL:
                    sagittal2DSlice = skimage.morphology.binary_dilation(rotSagittal(points3DDistanceMapBinary[:, sliceId, :]))
                    axarr[1,0].imshow(sagittal2DSlice, cmap=scribbleColorMap, norm=scribbleNorm)
                    axarr[1,1].imshow(sagittal2DSlice, cmap=scribbleColorMap, norm=scribbleNorm)
                    for (sliceNeighborId, columnId) in extraSliceIdsAndColumnIds:
                        axarr[1,columnId].imshow(rotSagittal(points3DDistanceMap[:, sliceNeighborId, :]), cmap=cmapScribbleDist, norm=normScribbleDist)
                elif viewType == KEY_CORONAL:
                    coronal2DSlice = skimage.morphology.binary_dilation(rotCoronal(points3DDistanceMapBinary[sliceId, :, :]))
                    axarr[2,0].imshow(coronal2DSlice, cmap=scribbleColorMap, norm=scribbleNorm)
                    axarr[2,1].imshow(coronal2DSlice, cmap=scribbleColorMap, norm=scribbleNorm)
                    for (sliceNeighborId, columnId) in extraSliceIdsAndColumnIds:
                        axarr[2,columnId].imshow(rotCoronal(points3DDistanceMap[sliceNeighborId, :, :]), cmap=cmapScribbleDist, norm=normScribbleDist)
        
        supTitleStr = 'CaseName: {} | SliceIdx: {} | SlideID: (per GUI): {}'.format(caseName, sliceId, sliceId+1)
        if points3D is not None:
            supTitleStr += '\n ( scribbleType: {} in view: {})'.format(scribbleType, viewType) 
        supTitleStr += r'\n(\textcolor{GT}{green}, \textcolor{Prev Pred}{red}, \textcolor{Refined Pred}{pink}, \textcolor{distance-hmap}{orange}'
        plt.suptitle(supTitleStr) #, usetex=True)
        
        # if saveFolderPath is None:
        #     plt.show()
        if saveFolderPath is not None:
            Path(saveFolderPath).mkdir(parents=True, exist_ok=True)
            saveFigPath = Path(saveFolderPath).joinpath('{}.png'.format(fileNameForSave(caseName, counter, str(viewType), int(sliceId))))
            plt.savefig(str(saveFigPath), bbox_inches='tight', dpi=SAVE_DPI)
            plt.close()

    except:
        plt.close()
        traceback.print_exc()
        if MODE_DEBUG: pdb.set_trace()

def plot(preparedDataTorch, segArrayGT, caseName, counter, points3D, scribbleType, refineArray=None, saveFolderPath=None):

    try:
        ctArray      = np.array(preparedDataTorch[0,0])
        ptArray      = np.array(preparedDataTorch[0,1])
        segArrayPred = np.array(preparedDataTorch[0,2])
        plotData(ctArray, ptArray, segArrayGT, segArrayPred, refineArray, None, caseName, counter, points3D, scribbleType, saveFolderPath=saveFolderPath)

    except:
        traceback.print_exc()
        if MODE_DEBUG: pdb.set_trace()

def plotUsingThread(plotFunc, *args):

    thread = threading.Thread(target=run_executor_in_thread, args=(plotFunc, *args))
    thread.daemon = True  # This makes the thread a daemon thread
    thread.start()

def run_executor_in_thread(func, *args):
    with ProcessPoolExecutor() as executor:
        future= executor.submit(func, *args)

#################################################################
#                        API ENDPOINTS
#################################################################

# Step 2 - Global Vars-related
SESSIONSGLOBAL = {}
DCMCLIENT      = None
MODEL          = None
DEVICE         = None

@asynccontextmanager
async def lifespan(app: fastapi.FastAPI):

    ################################################################## Step 1 - On startup
    global DEVICE
    global MODEL
    DEVICE = getTorchDevice()
    
    ######################## Experiment-wise settings ########################
    if 1:
        expName   = 'UNetv1__DICE-LR1e3__Class1__Trial1'
        epoch     = 100
        modelType = KEY_UNET_V1
        DEVICE    = torch.device('cpu')

    MODEL = loadModelUsingUserPath(DEVICE, expName, epoch, modelType)

    yield
    
    ################################################################## Step 1 - On startup
    print (' - [on_shutdown()] Nothing here!')

# Step 1 - App related
app     = fastapi.FastAPI(lifespan=lifespan)
configureFastAPIApp(app)
setproctitle.setproctitle("interactive-server.py") # set process name

# Step 3 - API Endpoints
@app.post("/prepare")
async def prepare(payload: PayloadPrepare, request: starlette.requests.Request):
    
    global DCMCLIENT
    global SESSIONSGLOBAL

    try:

        # Step 0 - Init
        tStart             = time.time()
        userAgent, referer = getRequestInfo(request)
        clientIdentifier   = payload.identifier
        preparePayloadData = payload.data.dict()
        patientName        = preparePayloadData[KEY_CASE_NAME]
        # user         = request.user # AuthenticationMiddleware must be installed to access request.user

        if clientIdentifier not in SESSIONSGLOBAL:
            SESSIONSGLOBAL[clientIdentifier] = {'userAgent': userAgent, KEY_CLIENT_IDENTIFIER: clientIdentifier}
        
        if patientName not in SESSIONSGLOBAL[clientIdentifier]:
            SESSIONSGLOBAL[clientIdentifier][patientName] = {KEY_DATA:{}, KEY_TORCH_DATA: {}
                                                , KEY_DCM_LIST: [], KEY_SCRIBBLE_COUNTER: 0
                                                , KEY_SEG_SOP_INSTANCE_UID: None, KEY_SEG_SERIES_INSTANCE_UID: None
                                                , KEY_SEG_ORTHANC_ID: None
                                                , KEY_DATETIME: datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                                                , KEY_SEG_ARRAY_GT: None
                                                }
            SESSIONSGLOBAL[clientIdentifier][patientName][KEY_PATH_SAVE] = Path(DIR_EXPERIMENTS).joinpath(SESSIONSGLOBAL[clientIdentifier][patientName][KEY_DATETIME] + ' -- ' + clientIdentifier)
            patientSeriesInstanceUID, patientSOPInstanceUID = getPatientUUIDs(patientName)
            SESSIONSGLOBAL[clientIdentifier][patientName][KEY_SEG_SERIES_INSTANCE_UID] = patientSeriesInstanceUID
            SESSIONSGLOBAL[clientIdentifier][patientName][KEY_SEG_SOP_INSTANCE_UID]    = patientSOPInstanceUID

        # Step 1 - Check if new scans are selected on the client side
        dataAlreadyPresent = True
        patientData = SESSIONSGLOBAL[clientIdentifier][patientName]
        if patientData[KEY_DATA] != preparePayloadData:
            dataAlreadyPresent = False
            patientData[KEY_DATA] = preparePayloadData
            patientData[KEY_TORCH_DATA] = []

            if DCMCLIENT == None:
                DCMCLIENT = getDCMClient(preparePayloadData[KEY_SEARCH_OBJ_CT][KEY_WADO_RS_ROOT])
                
            if DCMCLIENT != None:
                ctArrayProcessedBool, ctArray, ctArrayProcessed, patientData = getCTArray(DCMCLIENT, patientData)
                if ctArrayProcessedBool:
                    ptArray, ptArrayProcessed, patientData = getPTArray(DCMCLIENT, patientData)
                    if ptArray is not None:
                        segArrayGT, segArrayPred, patientData = getSEGs(DCMCLIENT, patientData)
                        if segArrayPred is not None:
                            if ctArray.shape == ptArray.shape == segArrayPred.shape:                               
                                # plotHistograms(ctArray, ctArrayProcessed, ptArray, ptArrayProcessed, segArrayGT, segArrayPred, patientName, patientData[KEY_PATH_SAVE])
                                # plotUsingThread(plotHistograms, ctArray, ctArrayProcessed, ptArray, ptArrayProcessed, segArrayGT, segArrayPred, patientName, patientData[KEY_PATH_SAVE])
                                if 1:
                                    saveFolderPath = patientData[KEY_PATH_SAVE]
                                    plotData(ctArray, ptArray, segArrayGT, segArrayPred, sliceId=94, caseName=patientName, saveFolderPath=saveFolderPath)
                                    plotData(ctArray, ptArray, segArrayGT, segArrayPred, sliceId=69, caseName=patientName, saveFolderPath=saveFolderPath)
                            else:
                                raise fastapi.HTTPException(status_code=500, detail="shapes dont match for patientName: {}".format(patientName))
                        else:
                            raise fastapi.HTTPException(status_code=500, detail="getSEGs() failed for patientName: {}".format(patientName))
                    else:
                        raise fastapi.HTTPException(status_code=500, detail="getPTArray() failed for patientName: {}".format(patientName))
                else:
                    raise fastapi.HTTPException(status_code=500, detail="getCTArray() failed for patientName: {}".format(patientName))
                
                SESSIONSGLOBAL[clientIdentifier][patientName] = patientData

        else:
            dataAlreadyPresent = True
        
        # Step 2 - Logging
        print ('|----------------------------------------------')
        print (' - /prepare (for {}) (dataAlreadyPresent:{}): {}'.format(clientIdentifier, dataAlreadyPresent, patientName))
        print ('|----------------------------------------------')

        # Step 99 - Return
        getMemoryUsage()
        tTotal = time.time() - tStart
        if dataAlreadyPresent:
            return {"status": "[clientIdentifier={}, patientName={}] Data already loaded into python server ({:.2f}s)".format(clientIdentifier, patientName, tTotal)}
        else:
            return {"status": "[clientIdentifier={}, patientName={}] Fresh data loaded into python server ({:.2f}s)".format(clientIdentifier, patientName, tTotal)}
        
    except pydantic.ValidationError as e:
        print (' - /prepare (from {},{}): {}'.format(referer, userAgent, e))
        logging.error(e)
        raise fastapi.HTTPException(status_code=500, detail="Error in /prepare for patientName: {} => {}".format(patientName, e))
    
    except Exception as e:
        traceback.print_exc()
        raise fastapi.HTTPException(status_code=500, detail="Error in /prepare for patientName: {} => {}".format(patientName, e))

@app.post("/process")
async def process(payload: PayloadProcess, request: starlette.requests.Request):

    global MODEL
    global DCMCLIENT
    global SESSIONSGLOBAL

    try:
        # Step 0 - Init
        tStart = time.time()
        userAgent, referer = getRequestInfo(request)
        clientIdentifier   = payload.identifier
        processPayloadData = payload.data.dict()
        patientName        = processPayloadData[KEY_CASE_NAME]

        # Step 1 - Check if session data is available
        dataAlreadyPresent = False
        if clientIdentifier not in SESSIONSGLOBAL:
            dataAlreadyPresent = False
        elif patientName not in SESSIONSGLOBAL[clientIdentifier]:
            dataAlreadyPresent = False
        else:
            dataAlreadyPresent = True
    
        # Step 2 - Logging
        print ('----------------------------------------------')
        print (' - /process (for {}): {} with MODEL: '.format(clientIdentifier, patientName, MODEL))
        print ('----------------------------------------------')
        getMemoryUsage()

        # Step 3 - Process scribble data
        if dataAlreadyPresent:
            
            # Step 3.0 - Init
            patientData       = SESSIONSGLOBAL[clientIdentifier][patientName]
            preparedData      = patientData[KEY_DATA]
            preparedDataTorch = patientData[KEY_TORCH_DATA]
            preparedDataTorch[0,3] = torch.zeros_like(preparedDataTorch[0,1])
            preparedDataTorch[0,4] = torch.zeros_like(preparedDataTorch[0,1])
            
            # Step 3.1 - Extract data
            points3D     = processPayloadData[KEY_POINTS_3D] # [(h/w, h/w, d), (), ..., ()] [NOTE: cornerstone3D sends array-indexed data, so now +1/-1 needed]
            points3D     = np.array([list(x) for x in points3D])
            scribbleType = processPayloadData[KEY_SCRIBBLE_TYPE]

            # Step 3.2 - Get distance map
            preparedDataTorch, viewType, sliceId = getDistanceMap(preparedDataTorch, scribbleType, points3D, DISTMAP_Z, DISTMAP_SIGMA)
            print (' - [process()] torch.sum(preparedDataTorch, dim=(2,3,4)): ', torch.sum(preparedDataTorch, dim=(2,3,4)))

            # Step 4.1 - Get refined segmentation
            tModel               = time.time()
            segArrayRefinedTorch, segArrayRefinedNumpy = doInference(MODEL, preparedDataTorch)
            totalInferenceTime   = time.time() - tModel
            if segArrayRefinedNumpy is None or segArrayRefinedTorch is None:
                raise fastapi.HTTPException(status_code=500, detail="Error in /process => doInference() failed")
            
            # Step 4.2 - Update counter for patient
            patientData[KEY_SCRIBBLE_COUNTER] += 1
            
            # Step 4.2 - Save refined segmentation
            makeSEGDICOMStatus, patientData = makeSEGDicom(segArrayRefinedNumpy, patientData, viewType, sliceId)
            
            # Step 4.99 - Plot refined segmentation
            if 1: 
                segArrayGT = patientData[KEY_SEG_ARRAY_GT]
                preparedDataTorchCopy = copy.deepcopy(preparedDataTorch)
                thread = threading.Thread(target=run_executor_in_thread, args=(plot, preparedDataTorchCopy, segArrayGT, patientName, patientData[KEY_SCRIBBLE_COUNTER], points3D, scribbleType, segArrayRefinedNumpy, patientData[KEY_PATH_SAVE]))
                thread.daemon = True  # This makes the thread a daemon thread
                thread.start()
            
            # Step 5 - Update global data
            preparedDataTorch[0,2]      = segArrayRefinedTorch
            patientData[KEY_TORCH_DATA] = preparedDataTorch
            SESSIONSGLOBAL[clientIdentifier][patientName] = patientData

            if not makeSEGDICOMStatus:
                raise fastapi.HTTPException(status_code=500, detail="Error in /process => makeSEGDicom failed")
            
            # Step 5 - Return
            totalProcessTime = time.time() - tStart
            returnObj = {"status": "[clientIdentifier={}] Data processed for python server. (model={:.4f}s, total={:.4f}s)".format(clientIdentifier, totalInferenceTime, totalProcessTime)}
            returnObj[KEY_RESPONSE_DATA] = {
                KEY_STUDY_INSTANCE_UID : preparedData[KEY_SEARCH_OBJ_CT][KEY_STUDY_INSTANCE_UID],
                KEY_SERIES_INSTANCE_UID: patientData[KEY_SEG_SERIES_INSTANCE_UID],
                KEY_SOP_INSTANCE_UID   : patientData[KEY_SEG_SOP_INSTANCE_UID],
                KEY_WADO_RS_ROOT       : preparedData[KEY_SEARCH_OBJ_CT][KEY_WADO_RS_ROOT]
            }
            return returnObj
        
        else:
            raise fastapi.HTTPException(status_code=500, detail=" [clientIdentifier={}, patientName={}] No data present in python server. Reload page.".format(clientIdentifier, patientName))
    
    except pydantic.ValidationError as e:
        print (' - /process (from {},{}): {}'.format(referer, userAgent, e))
        logging.error(e)
        raise fastapi.HTTPException(status_code=500, detail=" [clientIdentifier={}, patientName={}] Error in /process => {}".format(clientIdentifier, patientName, str(e)))

    except Exception as e:
        traceback.print_exc()
        raise fastapi.HTTPException(status_code=500, detail=" [clientIdentifier={}, patientName={}] Error in /process => {}".format(clientIdentifier, patientName, str(e)))

#################################################################
#                           MAIN
#################################################################

if __name__ == "__main__":

    os.execvp("uvicorn", ["uvicorn", "interactive-server:app", "--reload", "--host", HOST, "--port", str(PORT)])

"""
To-Do
1. Model training
 - [P] train the model with random sequence of 90 deg rotations along random axes
 - [P] train the model to do nothing when the scribble is made in a random region in the background.
 - [P] Change the Z-value of the distance map (randomly)
 - [P] include obedience loss in the model
"""

"""
Data-Transformation Pipeline
1. FROM base-model pipelines TO .dcms (where were validated in 3D Slicer)
    - for scans 
        --> 3 x anti-clockwise rotations --> Flip LR
    - for SEG
        --> np.moveaxis(maskArray, [0,1,2], [2,1,0])

2. From .dcms (in python) TO numpy/torch arrays
"""