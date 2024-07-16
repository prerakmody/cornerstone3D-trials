import pdb
import copy
import nrrd
import tqdm
import shutil
import pydicom
import inspect
import traceback
import numpy as np
import nibabel as nib
from pathlib import Path
import SimpleITK as sitk

import plotext as pltTerm
import matplotlib.pyplot as plt

# DICOM UIDs (Ref: http://dicom.nema.org/dicom/2013/output/chtml/part04/sect_I.4.html)
MODALITY_CT  = 'CT'
MODALITY_PT  = 'PT'
MODALITY_SEG = 'SEG'

SOP_CLASS_OBJ = {
    MODALITY_CT: '1.2.840.10008.5.1.4.1.1.2',
    MODALITY_PT: '1.2.840.10008.5.1.4.1.1.128', # [1.2.840.10008.5.1.4.1.1.128, 1.2.840.10008.5.1.4.1.1.130]
    MODALITY_SEG: '1.2.840.10008.5.1.4.1.1.66.4'
}
UID_TRANSFERSYNTAX  = '1.2.840.10008.1.2.1'

EXT_DCM  = '.dcm'
EXT_NRRD = '.nrrd'
EXT_NII  = '.nii.gz'
EXT_GZ   = '.gz'

def readNifti(pathNifti):
    data, header = None, None
    spacing, origin = None, None

    if Path(pathNifti).exists():
        nii_img      = nib.load(pathNifti)
        data, header = nii_img.get_fdata(), nii_img.header
        spacing      = header.get_zooms()
        origin       = header.get_qform()[:3,3]
    else:
        print (" - [readNifti()] Nifti file not found: ", pathNifti)
    
    return data, header, spacing, origin

def readNRRD(pathNRRD):

    data, header = None, None
    spacing, origin = None, None
    if Path(pathNRRD).exists():
        data, header = nrrd.read(pathNRRD)
        spacing      = tuple(np.diag(header["space directions"]))
        origin       = header.get("space origin", [0, 0, 0])
    else:
        print (" - [readNRRD()] NRRD file not found: ", pathNRRD)
    
    return data, header, spacing, origin

def readVolume(pathVolume):
    data, header = None, None

    if pathVolume.suffix == EXT_NRRD:
        data, header, spacing, origin = readNRRD(pathVolume)
    elif pathVolume.suffix == EXT_NII or pathVolume.suffix == EXT_GZ:
        data, header, spacing, origin = readNifti(pathVolume)
    else:
        print (" - [readVolume()] Invalid file format: ", pathVolume)
    
    return data, header, spacing, origin

def getDicomMeta(sopClassUID, sopInstanceUID):
    
    uid       = pydicom.uid.generate_uid()
    fileMeta = pydicom.dataset.FileMetaDataset()
    fileMeta.FileMetaInformationGroupLength = 254
    fileMeta.FileMetaInformationVersion     = b'\x00\x01'
    fileMeta.MediaStorageSOPClassUID        = sopClassUID
    fileMeta.MediaStorageSOPInstanceUID     = sopInstanceUID     
    fileMeta.TransferSyntaxUID              = UID_TRANSFERSYNTAX
    
    return fileMeta

def getBasicDicomDataset(patientName, studyUID, seriesUID, seriesNum, modality):

    # Step 1 - Create a basic dataset
    dataset = pydicom.dataset.Dataset()
    
    # Step 2 - Set the meta information
    dsMeta         = None
    sopInstanceUID = pydicom.uid.generate_uid()
    dsMeta         = getDicomMeta(SOP_CLASS_OBJ[modality], sopInstanceUID)
    dataset.file_meta = dsMeta

    # Step 3 - Patient Name    
    dataset.PatientName = patientName
    dataset.PatientID   = patientName

    # Step 4 - UIDs (useful when querying dicom servers)
    dataset.StudyInstanceUID  = studyUID
    dataset.SeriesInstanceUID = seriesUID
    dataset.SOPInstanceUID    = sopInstanceUID

    # Step 5 - Random tags for columns in the dicom file
    dataset.StudyDescription  = patientName + '-Study'
    dataset.SeriesDescription = patientName + '-Series-' + str(modality)
    dataset.SeriesNumber      = seriesNum
    dataset.ReferringPhysicianName = 'Dr. Mody :p'   

    # Step 6 - Other stuff
    dataset.is_little_endian = True
    dataset.SOPClassUID      = dsMeta.MediaStorageSOPClassUID
    dataset.Modality         = modality

    return dataset

def addCTPETDicomTags(ds, spacing, rows, cols):
    """
    From https://github.com/cornerstonejs/cornerstone3D/blob/v1.80.3/packages/core/src/utilities/generateVolumePropsFromImageIds.ts#L55
    const { BitsAllocated, PixelRepresentation, PhotometricInterpretation, ImageOrientationPatient, PixelSpacing, Columns, Rows, } = volumeMetadata;
    """

    try:
        # Step 1 - Position and Orientation
        ds.PatientPosition            = 'HFS'
        ds.ImageOrientationPatient    = [1, 0, 0, 0, 1, 0]
        ds.PositionReferenceIndicator = 'SN'
        ds.PhotometricInterpretation  = 'MONOCHROME2'

        # Step 2 - Pixel Data
        ds.Rows                       = rows
        ds.Columns                    = cols
        ds.PixelSpacing               = [float(spacing[0]), float(spacing[1])]
        ds.SliceThickness             = str(spacing[-1])

        # Step 3 - Pixel Datatype
        ds.BitsAllocated              = 16
        ds.BitsStored                 = 16
        ds.HighBit                    = 15
        ds.PixelRepresentation        = 1
        ds.SamplesPerPixel            = 1

        # Step 4 - Rescale
        ds.RescaleIntercept           = "0"
        ds.RescaleSlope               = "1"
        ds.RescaleType                = 'US' # US=Unspecified, HU=Hounsfield Units

        # Step 5 - Others
        ds.Manufacturer               = 'Hecktor2022-Cropped'

    except:
        traceback.print_exc()
        pdb.set_trace()

def makeCTPTDicomSlices(imageArray, origin, spacing, patientName, studyUID, seriesUID, seriesNum, pathFolder, modality, rotFunc):

    pixelValueList = []
    pathsList      = []

    try:
        print ('')
        print (modality)
        with tqdm.tqdm(total=imageArray.shape[0], leave=True, desc=' -- [makeCTPTDicomSlices({})]'.format(modality)) as pbarCT:
            for sliceIdx in range(imageArray.shape[-1]):
                
                # Step 1.0 - Create a basic dicom dataset
                dsCT = getBasicDicomDataset(patientName, studyUID, seriesUID, seriesNum, modality)
                addCTPETDicomTags(dsCT, spacing, imageArray.shape[0], imageArray.shape[1])
                
                # Step 1.1 - Set sliceIdx and origin
                dsCT.InstanceNumber       = str(sliceIdx+1)
                volOriginTmp              = list(copy.deepcopy(origin))
                volOriginTmp[-1]         += spacing[-1]*sliceIdx
                dsCT.ImagePositionPatient = volOriginTmp

                # Step 1.2 - Set pixel data
                pixelData        = rotFunc(imageArray[:,:,sliceIdx]) ## NOTE: helps to set right --> left orientation for .dcm files, refer: https://blog.redbrickai.com/blog-posts/introduction-to-dicom-coordinate
                if modality == MODALITY_CT:
                    pixelData = pixelData.astype(np.int16)
                if modality == MODALITY_PT:
                    pixelData = (pixelData * 1000).astype(np.int16)
                dsCT.PixelData = pixelData.tobytes()

                if sliceIdx == -1:
                    plt.imshow(pixelData, cmap='gray'); plt.title("{} Slice: {}".format(modality, sliceIdx))
                    plt.show(block=False)
                    pdb.set_trace()
                
                if modality == MODALITY_CT:
                    pixelValueList.extend(pixelData[(pixelData > -500) & (pixelData < 1200)].flatten().tolist())
                elif modality == MODALITY_PT:
                    pixelValueList.extend(pixelData[pixelData > 1.0].flatten().tolist())

                # Step 1.3 - Save the dicom file
                savePath = Path(pathFolder).joinpath(modality + '{:03d}'.format(sliceIdx) + '.' + str(dsCT.SOPInstanceUID) + EXT_DCM)
                dsCT.save_as(str(savePath), write_like_original=False)
                pathsList.append(savePath)

                pbarCT.update(1)
    except:
        traceback.print_exc()
        pdb.set_trace()
    
    return pixelValueList, pathsList

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

def makeSEGDicom(maskArray, maskSpacing, maskOrigin, metaInfoJsonPath, ctPathsList, patientName, maskType, studyUID, seriesNumber, contentCreatorName, pathFolderMask):

    try:

        # Step 1 - Convert to sitk image
        maskImage = sitk.GetImageFromArray(np.moveaxis(maskArray, [0,1,2], [2,1,0]).astype(np.uint8)); print (" - Doing makeSEGDICOM's np.moveaxis() as always") # np([H,W,D]) -> np([D,W,H]) -> sitk([H,W,D]) 
        # maskImage = sitk.GetImageFromArray(np.moveaxis(maskArray, [0,1,2], [1,2,0]).astype(np.uint8)); print (" - Doing makeSEGDICOM's np.moveaxis() differently")
        maskImage.SetSpacing(maskSpacing)
        maskImage.SetOrigin(maskOrigin)
        # print (' - [maskImage] rows: {}, cols: {}, slices: {}'.format(maskImage.GetHeight(), maskImage.GetWidth(), maskImage.GetDepth())) ## SITK is (Width, Height, Depth)

        # Step 2 - Create a basic dicom dataset        ``
        import pydicom_seg
        template                    = pydicom_seg.template.from_dcmqi_metainfo(metaInfoJsonPath)
        template.SeriesDescription  = '-'.join([patientName, maskType])
        template.SeriesNumber       = seriesNumber
        template.ContentCreatorName = contentCreatorName
        # template.ContentLabel       = maskType
        writer                      = pydicom_seg.MultiClassWriter(template=template, inplane_cropping=False, skip_empty_slices=False, skip_missing_segment=False)
        ctDcmsList                  = [pydicom.dcmread(dcmPath, stop_before_pixels=True) for dcmPath in ctPathsList]
        dcm                         = writer.write(maskImage, ctDcmsList)
        # print (' - rows: {} | cols: {} | numberofframes:{}'.format(dcm.Rows, dcm.Columns, dcm.NumberOfFrames))
        
        # Step 3 - Save the dicom file
        if seriesNumber == 3:
            set_segment_color(dcm, 0, [0, 255, 0]) # GT
        elif seriesNumber == 4: 
            set_segment_color(dcm, 0, [255, 0, 0]) # Pred
        dcm.StudyInstanceUID        = studyUID
        dcm.save_as(str(pathFolderMask / "mask.dcm"))

    except:
        traceback.print_exc()
        pdb.set_trace()

def terminalPlotHist(values, bins=100, titleStr="Histogram Plot"):

    try:
        
        pltTerm.hist(values, bins)
        pltTerm.title(titleStr + " (min: {} max: {})".format(np.min(values), np.max(values)))
        pltTerm.show()
        pltTerm.clf()

    except:
        traceback.print_exc()
        pdb.set_trace()

def studyDicomTags(ds): 
    """
    NOTES
    -----
    Modality=SEG
        - Per-frame Functional Groups Sequence: 
    """

    try:
        
        # Loop over dicom tags and print only the top-level ones
        for elem in ds:
            print (elem.name, elem.VR)
            if ds.Modality == 'SEG':
                if elem.name in ['Referenced Series Sequence', 'Segment Sequence', 'Shared Functional Groups Sequence']: #, 'Per-frame Functional Groups Sequence'] :
                    print (elem.name, elem.VR, elem.value)
            # if elem.VR != "SQ":
            #     print (elem.name, elem.VR)
            # else:
            #     print (elem.name, elem.VR, elem.value[0].name)
        
        pdb.set_trace()

    except:
        traceback.print_exc()
        pdb.set_trace()

def plot(ctArray, ptArray, maskArray, maskPredArray=None, sliceIds=[], patientName='', pathSavefigFolder=None):
    """
    Params:
        ctArray: [H, W, D]
        ptArray: [H, W, D]
        maskPredArray: [H, W, D]
    """
    
    # Keys - for colors
    COLORSTR_RED   = 'red'
    COLORSTR_GREEN = 'green'
    COLORSTR_PINK  = 'pink'
    COLORSTR_GRAY  = 'gray'

    # Define constants
    rotAxial    = lambda x: np.rot90(x, k=3)
    rotSagittal = lambda x: np.rot90(x, k=1)
    rotCoronal  = lambda x: np.rot90(x, k=1)

    totalSliceIdsToDisplay = 3

    try:
        
        if len(sliceIds) == 0:
            if maskArray is not None:
                gtPixelCountsInAxialSlices = np.sum(maskArray, axis=(0,1))
                randomSliceIds = np.random.choice(np.argwhere(gtPixelCountsInAxialSlices).flatten(), totalSliceIdsToDisplay)
            else:
                randomSliceIds = np.random.choice(ctArray.shape[2], totalSliceIdsToDisplay)
        else:
            randomSliceIds = sliceIds

        f,axarr = plt.subplots(3,len(randomSliceIds)*2, figsize=(15,15))

        axarr[0,0].set_ylabel('Axial')    # idx=2
        axarr[1,0].set_ylabel('Sagittal') # idx=0
        axarr[2,0].set_ylabel('Coronal')  # idx=1
        for i, sliceId in enumerate(randomSliceIds):
            
            # Plot Axial
            ctAxialSlice = ctArray[:,:,sliceId]
            ptAxialSlice = ptArray[:,:,sliceId]
            axarr[0,i*2].imshow(ctAxialSlice, cmap=COLORSTR_GRAY); axarr[0,i*2].set_title('Slice: ' + str(sliceId))
            axarr[0,i*2].imshow(ptAxialSlice, cmap=COLORSTR_GRAY, alpha=0.3)
            axarr[0,i*2+1].imshow(ctAxialSlice, cmap=COLORSTR_GRAY); axarr[0,i*2+1].set_title('Slice: ' + str(sliceId))
            axarr[0,i*2+1].imshow(ptAxialSlice, cmap=COLORSTR_GRAY, alpha=0.3)
            if maskArray is not None:
                maskAxialSlice = maskArray[:,:,sliceId]
                if np.max(maskAxialSlice) == 1:
                    axarr[0,i*2+1].contour(maskAxialSlice, colors=COLORSTR_GREEN)
            if maskPredArray is not None:
                maskAxialPredSlice = maskPredArray[:,:,sliceId]
                if np.max(maskAxialPredSlice) == 1:
                    axarr[0,i*2+1].contour(maskAxialPredSlice, colors=COLORSTR_RED)

            # Plot Sagittal
            ctSagittalSlice = rotSagittal(ctArray[sliceId,:,:])
            ptSagittalSlice = rotSagittal(ptArray[sliceId,:,:])
            axarr[1,i*2].imshow(ctSagittalSlice, cmap=COLORSTR_GRAY)
            axarr[1,i*2].imshow(ptSagittalSlice, cmap=COLORSTR_GRAY, alpha=0.3)
            axarr[1,i*2+1].imshow(ctSagittalSlice, cmap=COLORSTR_GRAY)
            axarr[1,i*2+1].imshow(ptSagittalSlice, cmap=COLORSTR_GRAY, alpha=0.3)
            if maskArray is not None:
                maskSagittalSlice = rotSagittal(maskArray[sliceId,:,:])
                if np.max(maskSagittalSlice) == 1:
                    axarr[1,i*2+1].contour(maskSagittalSlice, colors=COLORSTR_GREEN)
            if maskPredArray is not None:
                maskPredSagittallSlice = rotSagittal(maskPredArray[sliceId,:,:])
                if np.max(maskPredSagittallSlice) == 1:
                    axarr[1,i*2+1].contour(maskPredSagittallSlice, colors=COLORSTR_RED)

            # Plot Coronal
            ctCoronalSlice = rotCoronal(ctArray[:,sliceId,:])
            ptCoronalSlice = rotCoronal(ptArray[:,sliceId,:])
            axarr[2,i*2].imshow(ctCoronalSlice, cmap=COLORSTR_GRAY)
            axarr[2,i*2].imshow(ptCoronalSlice, cmap=COLORSTR_GRAY, alpha=0.3)
            axarr[2,i*2+1].imshow(ctCoronalSlice, cmap=COLORSTR_GRAY)
            axarr[2,i*2+1].imshow(ptCoronalSlice, cmap=COLORSTR_GRAY, alpha=0.3)
            if maskArray is not None:
                maskCoronalSlice = rotCoronal(maskArray[:,sliceId,:])
                if np.max(maskCoronalSlice) == 1:
                    axarr[2,i*2+1].contour(maskCoronalSlice, colors=COLORSTR_GREEN)
            if maskPredArray is not None:
                maskCoronalPredSlice = rotCoronal(maskPredArray[:,sliceId,:])
                if np.max(maskCoronalPredSlice) == 1:
                    axarr[2,i*2+1].contour(maskCoronalPredSlice, colors=COLORSTR_RED)
        
        pltTitleStr = 'Raw Array Plot (no .dcm stuff involved so far) \n' + patientName
        plt.suptitle(pltTitleStr)
        if pathSavefigFolder is None:
            plt.show()
        else:
            Path(pathSavefigFolder).mkdir(parents=True, exist_ok=True)
            plt.savefig(pathSavefigFolder / "{}.png".format(patientName))
            plt.close()

    except:
        traceback.print_exc()
        pdb.set_trace()

class DICOMConverterHecktor:

    def __init__(self, patientName, pathCT, pathPT, pathMask, pathMaskPred
                 , rotFunc, maskMetaInfoPath
                , maskGTSeriesDescSuffix, maskPredSeriesDescSuffix, maskGTCreatorName, maskPredCreatorName):
        
        # Step 1 - Basic info and paths
        self.patientName  = patientName
        self.pathCT       = pathCT
        self.pathPT       = pathPT
        self.pathMask     = pathMask
        self.pathMaskPred = pathMaskPred

        # Step 2 - Additional info 
        self.rotFunc          = rotFunc
        self.maskMetaInfoPath = maskMetaInfoPath
        self.maskGTSeriesDescSuffix   = maskGTSeriesDescSuffix
        self.maskPredSeriesDescSuffix = maskPredSeriesDescSuffix
        self.maskGTCreatorName        = maskGTCreatorName
        self.maskPredCreatorName      = maskPredCreatorName

        self._readFiles()

    def _readFiles(self):
        
        try:

            # Step 1 - Read NRRD files
            self.ctArray, self.ctHeader, self.ctSpacing, self.ctOrigin = readVolume(self.pathCT)
            self.ptArray, self.ptHeader, self.ptSpacing, self.ptOrigin = readVolume(self.pathPT)
            self.maskArray, self.maskHeader, self.maskSpacing, self.maskOrigin                 = readVolume(self.pathMask)
            self.maskPredArray, self.maskPredHeader, self.maskPredSpacing, self.maskPredOrigin = readVolume(self.pathMaskPred)
            
            # Step 1.1 - Some custom processing
            if 1:
                if self.ctArray.shape[-1] == 145:
                    self.ctArray  = self.ctArray[:,:,:-1]
                    self.ptArray = self.ptArray[:,:,:-1]
                    self.maskArray = self.maskArray[:,:,:-1]
                print (' - [DICOMConverterHecktor] CT: {}, PT: {}, Mask: {}, MaskPred: {}'.format(self.ctArray.shape, self.ptArray.shape, self.maskArray.shape, self.maskPredArray.shape))
            # assert self.ctArray.shape == self.ptArray.shape == self.maskArray.shape == self.maskPredArray.shape, " - [DICOMConverterHecktor] Shape mismatch: CT: {}, PET: {}, Mask: {}, MaskPred: {}".format(self.ctArray.shape, self.ptArray.shape, self.maskArray.shape, self.maskPredArray.shape)

            # Step 1.2 - Check Spacing
            floatify = lambda x: [float(i) for i in x] 
            self.ctSpacing = floatify(self.ctSpacing)
            self.ptSpacing = floatify(self.ptSpacing)
            self.maskSpacing = floatify(self.maskSpacing)
            self.maskPredSpacing = floatify(self.maskPredSpacing)
            assert self.ctSpacing == self.ptSpacing == self.maskSpacing == self.maskPredSpacing, " - [DICOMConverterHecktor] Spacing mismatch: CT: {}, PET: {}, Mask: {}, MaskPred: {}".format(self.ctSpacing, self.ptSpacing, self.maskSpacing, self.maskPredSpacing)

            # Step 3 - Get origins
            self.ctOrigin = [0, 0, 0]
            self.ptOrigin = [0, 0, 0]
            self.maskOrigin = [0, 0, 0]
            self.maskPredOrigin = [0, 0, 0]
            print (' - [DICOMConverterHecktor] Setting all origins to (0,0,0)')

            # Step 4 - Create folders and make UIDs
            self._createFolders()

            # Step 5 - Plot
            if 1:
                plot(self.ctArray, self.ptArray, self.maskArray, self.maskPredArray, patientName=self.patientName, pathSavefigFolder=self.pathParentFolder / self.patientName)

        except:
            traceback.print_exc()
            pdb.set_trace()

    def _createFolders(self):
        
        self.pathParentFolder   = Path(self.pathCT).parent.absolute()
        self.pathFolderCT       = self.pathParentFolder / self.patientName / "CT"
        self.pathFolderPT       = self.pathParentFolder / self.patientName / "PT"
        self.pathFolderMask     = self.pathParentFolder / self.patientName / "Mask"
        self.pathFolderMaskPred = self.pathParentFolder / self.patientName / "MaskPred"

        if Path(self.pathFolderCT).exists():
            shutil.rmtree(self.pathFolderCT)
        if Path(self.pathFolderPT).exists():
            shutil.rmtree(self.pathFolderPT)
        if Path(self.pathFolderMask).exists():
            shutil.rmtree(self.pathFolderMask)
        if Path(self.pathFolderMaskPred).exists():
            shutil.rmtree(self.pathFolderMaskPred)

        Path(self.pathFolderCT).mkdir(parents=True, exist_ok=True)
        Path(self.pathFolderPT).mkdir(parents=True, exist_ok=True)
        Path(self.pathFolderMask).mkdir(parents=True, exist_ok=True)
        Path(self.pathFolderMaskPred).mkdir(parents=True, exist_ok=True)

    def convertToDICOM(self):
        
        try:

            # Step 0 - Make commons UIDs
            self.studyUID = pydicom.uid.generate_uid()

            # Step 1 - Convert CT
            print ('\n - [convertToDICOM()] rotFunc: ', inspect.getsource(self.rotFunc))
            if 1:
                ctSeriesUID = pydicom.uid.generate_uid()
                ctSeriesNum = 1
                ctPixelValueList, ctPathsList = makeCTPTDicomSlices(self.ctArray, self.ctOrigin, self.ctSpacing, self.patientName, self.studyUID, ctSeriesUID, ctSeriesNum, self.pathFolderCT, MODALITY_CT, self.rotFunc)
                # terminalPlotHist(ctPixelValueList, bins=100, titleStr="CT Histogram Plot")

            # Step 2 - Convert PT
            if 1:
                ptSeriesUID = pydicom.uid.generate_uid()
                ptSeriesNum = 2
                ptPixelValueList = makeCTPTDicomSlices(self.ptArray, self.ptOrigin, self.ptSpacing, self.patientName, self.studyUID, ptSeriesUID, ptSeriesNum, self.pathFolderPT, MODALITY_PT, self.rotFunc)
                # terminalPlotHist(ptPixelValueList, bins=100, titleStr="PT Histogram Plot")

            # Step 3 - Convert Mask
            if 1:

                # Step 3.1 - Mask (GT)
                print ('\n - [convertToDICOM()] Making SEG Dicom for GT Masks...')
                seriesNumber            = 3
                makeSEGDicom(self.maskArray, self.maskSpacing, self.maskOrigin, self.maskMetaInfoPath, ctPathsList
                             , self.patientName,  self.maskGTSeriesDescSuffix, self.studyUID, seriesNumber, self.maskGTCreatorName, self.pathFolderMask)
                
                # Step 3.2 - Mask (Pred)
                print ('\n - [convertToDICOM()] Making SEG Dicom for Predicted Masks...')
                seriesNumber            = 4
                makeSEGDicom(self.maskPredArray, self.maskPredSpacing, self.maskPredOrigin, self.maskMetaInfoPath, ctPathsList
                             , self.patientName,  self.maskPredSeriesDescSuffix, self.studyUID, seriesNumber, self.maskPredCreatorName, self.pathFolderMaskPred)
                

        except:
            traceback.print_exc()
            pdb.set_trace() 

if __name__ == "__main__":

    DIR_FILE   = Path(__file__).parent.absolute()     # <root>/src/backend/
    DIR_SRC    = DIR_FILE.parent.absolute()           # <root>/src/
    DIR_MAIN   = DIR_SRC.parent.absolute()            # <root>/
    DIR_ASSETS = DIR_SRC / "assets"                  # <root>/assets/
    DIR_DATA = DIR_MAIN.parent.absolute() / "_data"   # <pre-root>/_data/
    

    if 1:
        DIR_CLINIC           = DIR_DATA / "Hecktor2021" / "trial2-CHMR"
        rotFunc              = lambda x: np.fliplr(np.rot90(x, k=3)) ## NOTE: helps to set right --> left orientation for .dcm files, refer: https://blog.redbrickai.com/blog-posts/introduction-to-dicom-coordinate
        # rotFunc              = lambda x:x
        maskMetaInfoPath     = DIR_ASSETS / 'metainfo-segmentation.json'
        maskGTSeriesDescSuffix   = 'Series-SEG-GT'
        maskPredSeriesDescSuffix = 'Series-SEG-Pred'
        maskGTCreatorName        = 'Hecktor2022'
        maskPredCreatorName      = 'Modys AI model'

        for patientName in ['CHMR001', 'CHMR004', 'CHMR005', 'CHMR011', 'CHMR012', 'CHMR013', 'CHMR014', 'CHMR016', 'CHMR020', 'CHMR021', 'CHMR023', 'CHMR024', 'CHMR025', 'CHMR028', 'CHMR029', 'CHMR030', 'CHMR034', 'CHMR040']:
        # # for patientName in ['CHMR016']:
        # # for patientName in ['CHMR040']:
        # for patientName in ['CHMR004']:
            pathCT       = DIR_CLINIC / "{}_ct.nii.gz".format(patientName)      # "nrrd_CHMR001_img1.nrrd"
            pathPT       = DIR_CLINIC / "{}_pt.nii.gz".format(patientName)      # "nrrd_CHMR001_img2.nrrd"
            pathMask     = DIR_CLINIC / "{}_gtvt.nii.gz".format(patientName)    # ["nrrd_CHMR001_mask.nrrd", "CHMR001_gtvt.nii.gz"]
            pathMaskPred = DIR_CLINIC / "nrrd_{}_maskpred.nrrd".format(patientName)

            converterClass = DICOMConverterHecktor(patientName, pathCT, pathPT, pathMask, pathMaskPred
                                                , rotFunc, maskMetaInfoPath
                                                , maskGTSeriesDescSuffix, maskPredSeriesDescSuffix, maskGTCreatorName, maskPredCreatorName)
            converterClass.convertToDICOM()

"""
OHIF in Orthanc
 - ReferencedSeriesSequence is missing for the SEG 
 - for elem in ds: print (elem.name, elem.VR) if elem.VR == "SQ": pass

SEG modality in DICOM
 - np,moveaxis([0,1,2], [2,1,0]) shows it correctly in 3D Slicer and myC3D app
 - does not show correctly in matplotlib. Makes me question whether torch is getting the right arrays.
"""