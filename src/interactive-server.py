import os
import pdb
import time
import psutil
import logging
import platform
import traceback
from pathlib import Path

import typing
import fastapi
import uvicorn
import pydantic
import starlette
import fastapi.middleware.cors
import starlette.middleware.sessions

import torch
import monai

KEY_UNET_V1          = 'unet_v1'
KEY_MODEL_STATE_DICT = 'model_state_dict'
EPOCH_STR            = 'epoch_{:04d}'
SHAPE_TENSOR         = (1, 5, 96, 96, 96)

HOST = 'localhost'
PORT = 55000

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
    print (request.headers)
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
    searchObjRTS: SearchObj = pydantic.Field(...)
    caseName: str = pydantic.Field(...)

class PayloadPrepare(pydantic.BaseModel):
    data: PreparedData = pydantic.Field(...)
    identifier: str = pydantic.Field(...)

class ProcessData(pydantic.BaseModel):
    points3D: typing.List[typing.Tuple[int, int, int]] = pydantic.Field(...)
    scribbleType: str = pydantic.Field(...)

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

def loadModelUsingUserPath(device):

    model = None
    try:

        print ('\n =========================== [loadModelUsingUserPath()] =========================== \n')
        # Step 1 - Define paths
        DIR_FILE  = Path(__file__).parent.absolute() # src/
        DIR_MAIN  = DIR_FILE.parent.absolute() # ./visualizer/
        DIR_MODELS = DIR_MAIN / '_models/'
        if 1:
            expName = 'UNetv1__DICE-LR1e3__Class1__Trial1'
            epoch     = 100
            modelType = KEY_UNET_V1
        
        # Step 2 - Load model
        getMemoryUsage()
        modelPath = Path(DIR_MODELS) / expName / EPOCH_STR.format(epoch) / EPOCH_STR.format(epoch)
        if Path(modelPath).exists():
            print (' - [loadModel()] Loading model from: ', modelPath)
            print (' - [loadModel()] Device: ', device)
            
            model     = loadModel(modelPath, modelType, device=device)
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

#################################################################
#                        API ENDPOINTS
#################################################################

# Step 1 - App related
app     = fastapi.FastAPI()
configureFastAPIApp(app)
DEVICE  = getTorchDevice()
DEVICE  = torch.device('cpu')

# Step 2 - Global Vars-related
sessionsGlobal = {}
model          = loadModelUsingUserPath(DEVICE)

# Step 3 - API Endpoints
@app.post("/prepare")
async def prepare(payload: PayloadPrepare, request: starlette.requests.Request):
    
    try:

        # Step 0 - Init
        userAgent, referer = getRequestInfo(request)
        clientIdentifier = payload.identifier
        preparedData     = payload.data.dict()
        # user         = request.user # AuthenticationMiddleware must be installed to access request.user
        if clientIdentifier not in sessionsGlobal:
            sessionsGlobal[clientIdentifier] = {'userAgent': userAgent, 'data':{}, 'torchData': {}}
        
        # Step 1 - Check if new scans are selected on the client side
        dataAlreadyPresent = True
        if sessionsGlobal[clientIdentifier]['data'] != preparedData:
            dataAlreadyPresent = False
            sessionsGlobal[clientIdentifier]['data'] = preparedData
            sessionsGlobal[clientIdentifier]['torchData'] = torch.randn(SHAPE_TENSOR, device=DEVICE)
        else:
            dataAlreadyPresent = True
        
        # Step 2 - Logging
        print ('|----------------------------------------------')
        print (' - /prepare (for {}) (dataAlreadyPresent:{}): {}'.format(clientIdentifier, dataAlreadyPresent, preparedData))
        print ('|----------------------------------------------')

        # Step 99 - Return
        getMemoryUsage()
        if dataAlreadyPresent:
            return {"status": "[clientIdentifier={}] Data already loaded into python server".format(clientIdentifier)}
        else:
            return {"status": "[clientIdentifier={}] Fresh data loaded into python server".format(clientIdentifier)}
        
    except pydantic.ValidationError as e:
        print (' - /prepare (from {},{}): {}'.format(referer, userAgent, e))
        logging.error(e)
        return {"status": "Error in /prepare => " + str(e)}
    
    except Exception as e:
        traceback.print_exc()
        return {"status": "Error in /prepare => " + str(e)}

@app.post("/process")
async def process(payload: PayloadProcess, request: starlette.requests.Request):

    try:
        # Step 0 - Init
        userAgent, referer = getRequestInfo(request)
        clientIdentifier   = payload.identifier
        processData        = payload.data.dict()

        # Step 1 - Check if session data is available
        dataAlreadyPresent = False
        if clientIdentifier not in sessionsGlobal:
            dataAlreadyPresent = False
        else:
            dataAlreadyPresent = True
            preparedData      = sessionsGlobal[clientIdentifier]['data']
            preparedDataTorch = sessionsGlobal[clientIdentifier]['torchData']
    
        # Step 2 - Logging
        print ('----------------------------------------------')
        print (' - /process (for {}): {}'.format(clientIdentifier, ''))
        print ('----------------------------------------------')

        # Step 99 - Return
        getMemoryUsage()
        if dataAlreadyPresent:
            points3D = processData['points3D']
            scribbleType = processData['scribbleType']
            print ('  - [process()] preparedDataTorch:', preparedDataTorch.shape, preparedDataTorch.device)
            print ('  - [process()] points3D:', points3D)
            print ('  - [process()] scribbleType:', scribbleType)
            t0 = time.time()
            _ = model(preparedDataTorch)
            totalInferenceTime = time.time() - t0
            return {"status": "[clientIdentifier={}] Data processed for python server in {:.4f}s".format(clientIdentifier, totalInferenceTime)}
        else:
            return {"status": "[clientIdentifier={}] No data present in python server".format(clientIdentifier)}
    
    except pydantic.ValidationError as e:
        print (' - /process (from {},{}): {}'.format(referer, userAgent, e))
        logging.error(e)
        return {"status": "Error in /process => " + str(e)}

    except Exception as e:
        traceback.print_exc()
        return {"status": "Error in /prepare => " + str(e)}

#################################################################
#                           MAIN
#################################################################

if __name__ == "__main__":

    os.execvp("uvicorn", ["uvicorn", "interactive-server:app", "--reload", "--host", HOST, "--port", str(PORT)])