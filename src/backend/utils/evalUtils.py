"""
Process
1. Take manual and semi-automated folder input
2. Loop over the .dcm files in each folder and find out unique patientsIds
 - patientsManual = {'CHMR028' : [CHMR028-ManualRefine-1.dcm]}
 - patientsSemiAuto = {'CHMR028' : [CHMR028-Refine-1.dcm]}
3. Download the GT and prediction of this patient
"""

# Import public libs 
import pdb
import pydicom
import traceback
import numpy as np
import pandas as pd
import seaborn as sns
from pathlib import Path
import matplotlib.pyplot as plt

# Import private libs
import orthancRequestUtils

# Constants
DIR_FILE        = Path(__file__).resolve().parent # <projectRoot>/src/backend/utils/
DIR_ROOT        = DIR_FILE.parent.parent.parent # <projectRoot>/src/backend/
DIR_EXPERIMENTS = DIR_ROOT / '_experiments'

KEY_MANUAL_DICE = 'manual_dice'
KEY_SEMIAUTO_DICE = 'semiauto_dice'

KEY_PATIENTID = 'patientId'
KEY_INTERACTIONTYPE = 'interactionType'
KEY_INTERACTIONCOUNT = 'interactionCount'
KEY_DICE =  'dice'

def compute_dice(mask_gt, mask_pred, meta=''):
    """Compute soerensen-dice coefficient.
    Returns:
    the dice coeffcient as float. If both masks are empty, the result is NaN
    """
    volume_sum = mask_gt.sum() + mask_pred.sum()
    if volume_sum == 0:
        print (f" - [compute_dice()] Both masks are empty for {meta}")
        return np.NaN
    volume_intersect = (mask_gt & mask_pred).sum()
    return 2*volume_intersect / volume_sum

def getRefineDCMs(pathsManualExperiments, pathsSemiAutoExperiments):
    
    patientsManual, patientsSemiAuto = {}, {}

    try:
        
        # Step 1 - Loop over the manual experiments
        for pathManual in pathsManualExperiments:
            if not Path(pathManual).exists():
                print (f" - [ERROR][getRefineDCMs()] pathManual: {pathManual} does not exist")
            for dcmFile in sorted(list(pathManual.glob('**/*.dcm'))):
                patientId = dcmFile.name.split('-')[0]
                if patientId not in patientsManual:
                    patientsManual[patientId] = []
                patientsManual[patientId].append(dcmFile)
        
        # Step 2 - Loop over the semi-auto experiments
        for pathSemiAuto in pathsSemiAutoExperiments:
            if not Path(pathSemiAuto).exists():
                print (f" - [ERROR][getRefineDCMs()] pathSemiAuto: {pathSemiAuto} does not exist")
            for dcmFile in sorted(list(pathSemiAuto.glob('**/*.dcm'))):
                patientId = dcmFile.name.split('-')[0]
                if patientId not in patientsSemiAuto:
                    patientsSemiAuto[patientId] = []
                patientsSemiAuto[patientId].append(dcmFile)
     
    except:
        traceback.print_exc()
        pdb.set_trace()
    
    return patientsManual, patientsSemiAuto

def eval(pathsManualExperiments, pathsSemiAutoExperiments):
     
    try:
        # Step 0 - Init
        resDICE = {}
        resPlot = []

        # Step 1 - Get the manual and semi-auto experiments
        patientsManual, patientsSemiAuto = getRefineDCMs(pathsManualExperiments, pathsSemiAutoExperiments)
        allPatientIds = list(set(list(patientsManual.keys()) + list(patientsSemiAuto.keys())))
          
        # Step 2 - Get GT/Pred
        for patientId in allPatientIds:
            
            # Step 2.0 - Init
            resDICE[patientId] = {KEY_MANUAL_DICE:[], KEY_SEMIAUTO_DICE:[]}

            # Step 2.1 - Some .dcm and Orthanc stuff
            patientIdObj       = orthancRequestUtils.getOrthancPatientIds(patientId)
            arrayGT, arrayPred = orthancRequestUtils.getSegsArray(patientId, patientIdObj)
            listObjsCT         = orthancRequestUtils.getPyDicomObjects(patientId, patientIdObj, orthancRequestUtils.MODALITY_CT)

            # Step 2.2 - Get the GT and Pred masks (and compute DICE for step=0)
            baseDICE = compute_dice(arrayGT, arrayPred, meta=f"{patientId} - GT/Pred")
            resDICE[patientId][KEY_MANUAL_DICE].append(baseDICE)
            resDICE[patientId][KEY_SEMIAUTO_DICE].append(baseDICE)
            resPlot.append([patientId, KEY_MANUAL_DICE, 0, baseDICE])
            resPlot.append([patientId, KEY_SEMIAUTO_DICE, 0, baseDICE])

            # Step 3.1 - Read patientsManual[patientId] and compute DICE
            if 1:
                arrayGTCopy = arrayGT.copy()
                arrayGTForManual = np.moveaxis(arrayGTCopy,[0,1,2], [2,0,1])
                for fileId, pathDcmFile in enumerate(patientsManual[patientId]):
                    try:
                        maskArrayManualRefine = orthancRequestUtils.getSegArrayInShapeMismatchScene(listObjsCT, pathDcmFile)
                        dice = compute_dice(maskArrayManualRefine.astype(np.uint8), arrayGTForManual, meta=f"{patientId} - {pathDcmFile}")
                        if 0:
                            sliceIdx = 71; plt.imshow(maskArrayManualRefine[:,:,sliceIdx], cmap='gray'); plt.imshow(arrayGTForManual[:,:,sliceIdx], alpha=0.5, cmap='gray');plt.show()
                        # print (f" - [INFO][eval()][{KEY_MANUAL_DICE}][id={fileId}] patientId: {patientId} id: {fileId} dice: {dice}")
                        resDICE[patientId][KEY_MANUAL_DICE].append(dice)
                        resPlot.append([patientId, KEY_MANUAL_DICE, fileId+1, dice])
                    except:
                        print (f" - [ERROR][eval()][{KEY_MANUAL_DICE}][id={fileId}] Error in patientId: {patientId} dcmFile: {pathDcmFile}")
                        traceback.print_exc()
                        pdb.set_trace()
                        resDICE[patientId][KEY_MANUAL_DICE].append(-1)

            # Step 3.2 - Read patientsSemiAuto[patientId] and compute DICE
            if 1:
                for fileId, pathDcmFile in enumerate(patientsSemiAuto[patientId]):
                    try:
                        ds = pydicom.dcmread(pathDcmFile)
                        maskArray = ds.pixel_array
                        dice = compute_dice(maskArray, arrayGT, meta=f"{patientId} - {pathDcmFile}")
                        resDICE[patientId][KEY_SEMIAUTO_DICE].append(dice)
                        resPlot.append([patientId, KEY_SEMIAUTO_DICE, fileId+1, dice])
                    except:
                        print (f" - [ERROR][eval()][{KEY_SEMIAUTO_DICE}][id={fileId}] Error in patientId: {patientId} dcmFile: {pathDcmFile}")
                        traceback.print_exc()
                        resDICE[patientId][KEY_SEMIAUTO_DICE].append(-1)
        
        # Step 4 - Plot
        df = pd.DataFrame(resPlot, columns=[KEY_PATIENTID, KEY_INTERACTIONTYPE, KEY_INTERACTIONCOUNT, KEY_DICE])
        sns.lineplot(x=KEY_INTERACTIONCOUNT, y=KEY_DICE, hue=KEY_INTERACTIONTYPE, data=df)
        sns.boxplot(x=KEY_INTERACTIONCOUNT, y=KEY_DICE, hue=KEY_INTERACTIONTYPE, data=df)
        plt.ylim(0.7, 1.1)
        plt.show()
        pdb.set_trace()
     
    except:
        traceback.print_exc()
        pdb.set_trace()

if __name__ == "__main__":

    ## -------------------- Step 1 - Define the manual and semi-auto experiments --------------------
    if 1:
        pathsManualExperiments = [
            DIR_EXPERIMENTS / '2024-10-15 12-06-39 -- gracious_torvalds__Prerak-Mody-NonExpert'
        ]
        pathsSemiAutoExperiments = [
            DIR_EXPERIMENTS / '2024-10-15 12-17-23 -- happy_carver__Prerak-Mo0dy-NonExpert'
        ]
    
    eval(pathsManualExperiments, pathsSemiAutoExperiments)