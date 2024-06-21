import logging
logging.basicConfig(level=logging.DEBUG)

import os
import platform
import traceback

import typing
import fastapi
import uvicorn
import pydantic
import starlette
import fastapi.middleware.cors
import starlette.middleware.sessions

import psutil
import torch

def getTorchDevice():
    device = torch.device('cpu')
    if platform.system() == 'Darwin':
        if torch.backends.mps.is_available(): device = torch.device('mps')
    elif platform.system() in ['Linux', 'Windows']:
        if torch.backends.cuda.is_available(): device = torch.device('cuda')
    else:
        print (' - Unknown platform: {}'.format(platform.system()))

    print ('\n - Device: {}\n'.format(device))

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

device = getTorchDevice()
getMemoryUsage()

app = fastapi.FastAPI()
# app.add_middleware(starlette.middleware.sessions.SessionMiddleware, secret_key="your-secret-key")

origins = [f"http://localhost:{port}" for port in range(49000, 51000)]  # Replace with your range of ports
app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    # allow_origins=["*"],  # Allows all origins
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

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

class PayloadProcess(pydantic.BaseModel):
    data: ProcessData = pydantic.Field(...)
    identifier: str = pydantic.Field(...)

sessionsGlobal = {}

def getRequestInfo(request):
    print (request.headers)
    userAgent = request.headers.get('user-agent', 'userAgentIsNone')
    referer   = request.headers.get('referer', 'refererIsNone')
    return userAgent, referer

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
            sessionsGlobal[clientIdentifier]['torchData'] = torch.randn((1, 4, 196, 196, 196), device=device)
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
        return {"status": "Error in /prepare:" + str(e)}
    
    except Exception as e:
        traceback.print_exc()
        return {"status": "Error in /prepare:" + str(e)}

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
            return {"status": "[clientIdentifier={}] Data processed for python server".format(clientIdentifier)}
        else:
            return {"status": "[clientIdentifier={}] No data present in python server".format(clientIdentifier)}
    
    except pydantic.ValidationError as e:
        print (' - /process (from {},{}): {}'.format(referer, userAgent, e))
        logging.error(e)
        return {"status": "Error in /process"}

if __name__ == "__main__":
    # uvicorn.run(app, host="localhost", port=5500) # When running python interactive-server.py I get "WARNING:  You must pass the application as an import string to enable 'reload' or 'workers'."
    os.execvp("uvicorn", ["uvicorn", "interactive-server:app", "--reload", "--host", "localhost", "--port", "5500"])
    getMemoryUsage()
