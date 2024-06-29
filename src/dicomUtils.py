import pdb
import copy
import nrrd
import tqdm
import shutil
import pydicom
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

def makeCTPTDicomSlices(imageArray, origin, spacing, patientName, studyUID, seriesUID, seriesNum, pathFolder, modality):

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
                pixelData      = np.rot90(imageArray[:,:,sliceIdx], k=3) # anti-clockwise rotation x 3
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

def plot(ctArray, ptArray, maskPredArray=None, sliceIds=[]):
    """
    Params:
        ctArray: [H, W, D]
        ptArray: [H, W, D]
        maskPredArray: [H, W, D]
    """
    
    try:
        if len(sliceIds) == 0:
            randomSliceIds = np.random.choice(ctArray.shape[2], 3)
        else:
            randomSliceIds = sliceIds
        f,axarr = plt.subplots(len(randomSliceIds),3,figsize=(15,15))

        for i, sliceId in enumerate(randomSliceIds):

            # Plot CT
            axarr[i,0].imshow(ctArray[:,:,sliceId], cmap='gray')
            axarr[i,0].set_ylabel('Slice: ' + str(sliceId))

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
        pdb.set_trace()

class DICOMConverterHecktor:

    def __init__(self, patientName, pathCT, pathPT, pathMask, pathMaskPred):
        
        self.patientName      = patientName
        self.pathCT       = pathCT
        self.pathPT       = pathPT
        self.pathMask     = pathMask
        self.pathMaskPred = pathMaskPred

        self._readFiles()

    def _readFiles(self):
        
        try:

            # Step 1 - Read NRRD files
            self.ctArray, self.ctHeader, self.ctSpacing, self.ctOrigin = readVolume(self.pathCT)
            self.ptArray, self.ptHeader, self.ptSpacing, self.ptOrigin = readVolume(self.pathPT)
            self.maskArray, self.maskHeader, self.maskSpacing, self.maskOrigin                 = readVolume(self.pathMask)
            self.maskPredArray, self.maskPredHeader, self.maskPredSpacing, self.maskPredOrigin = readVolume(self.pathMaskPred)
            
            # Step 1.1 - Some custom processing
            if 0:
                self.ctArray  = self.ctArray[:,:,:-1]
                self.ptArray = self.ptArray[:,:,:-1]
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

            # Step 4 - Create folders and make UIDs
            self._createFolders()

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

        Path(self.pathFolderCT).mkdir(parents=True, exist_ok=True)
        Path(self.pathFolderPT).mkdir(parents=True, exist_ok=True)
        Path(self.pathFolderMask).mkdir(parents=True, exist_ok=True)
        Path(self.pathFolderMaskPred).mkdir(parents=True, exist_ok=True)

    def convertToDICOM(self):
        
        try:

            # Step 0 - Make commons UIDs
            self.studyUID = pydicom.uid.generate_uid()

            # Step 1 - Convert CT
            if 1:
                ctSeriesUID = pydicom.uid.generate_uid()
                ctSeriesNum = 1
                ctPixelValueList, ctPathsList = makeCTPTDicomSlices(self.ctArray, self.ctOrigin, self.ctSpacing, self.patientName, self.studyUID, ctSeriesUID, ctSeriesNum, self.pathFolderCT, MODALITY_CT)
                # terminalPlotHist(ctPixelValueList, bins=100, titleStr="CT Histogram Plot")

            # Step 2 - Convert PT
            if 0:
                ptSeriesUID = pydicom.uid.generate_uid()
                ptSeriesNum = 2
                ptPixelValueList = makeCTPTDicomSlices(self.ptArray, self.ptOrigin, self.ptSpacing, self.patientName, self.studyUID, ptSeriesUID, ptSeriesNum, self.pathFolderPT, MODALITY_PT)
                # terminalPlotHist(ptPixelValueList, bins=100, titleStr="PT Histogram Plot")

            # Step 3 - Convert Mask
            if 1:
                
                self.maskArray[self.maskArray == 1] = 2
                # maskImage = sitk.GetImageFromArray(self.maskArray.astype(np.uint8))
                maskImage = sitk.GetImageFromArray(np.moveaxis(self.maskArray, [0,1,2], [2,1,0]).astype(np.uint8)) # np([H,W,D]) -> np([D,W,H]) -> sitk([H,W,D])
                # SITK is (Width, Height, Depth) and np is 
                maskImage.SetSpacing(self.maskSpacing)
                maskImage.SetOrigin(self.maskOrigin)
                # print (' - [maskImage] rows: {}, cols: {}, slices: {}'.format(maskImage.GetHeight(), maskImage.GetWidth(), maskImage.GetDepth()))

                
                import pydicom_seg
                template = pydicom_seg.template.from_dcmqi_metainfo(Path(DIR_FILE) / 'metainfo-segmentation.json')
                template.SeriesDescription = self.patientName + '-Series-SEG-GT'
                template.SeriesNumber       = 3
                template.ContentCreatorName = 'Hecktor2022' # ['Modys AI model']
                writer = pydicom_seg.MultiClassWriter(template=template, inplane_cropping=False, skip_empty_slices=False, skip_missing_segment=False)
                ctDcmsList = [pydicom.dcmread(dcmPath, stop_before_pixels=True) for dcmPath in ctPathsList]
                dcm = writer.write(maskImage, ctDcmsList)
                
                dcm.StudyInstanceUID  = self.studyUID
                print (' - rows: {} | cols: {} | numberofframes:{}'.format(dcm.Rows, dcm.Columns, dcm.NumberOfFrames))
                # dcm.Rows = 144
                # dcm.Columns = 144
                # print (dcm.Rows, dcm.Columns, dcm.NumberOfFrames)

                
                # dcm.PixelData = np.moveaxis(self.maskArray, [0,1,2], [2,1,0]).astype(np.uint8).tobytes()
                dcm.save_as(str(self.pathFolderMask / "mask.dcm"))
                
                # decodedMaskArray = dcm.pixel_array
                # print (decodedMaskArray.shape, self.maskArray.shape)
                # plot(self.ctArray, self.ptArray, decodedMaskArray, sliceIds=[20, 54, 90])
                # plot(self.ctArray, self.ptArray, self.maskArray, sliceIds=[20, 54, 90])
                # bytes_array = np.frombuffer(dcm.PixelData, dtype=np.uint8)
                # unpacked_bits = np.unpackbits(bytes_array, bitorder='little')
                
                # studyDicomTags(dcm)
                pdb.set_trace()



        except:
            traceback.print_exc()
            pdb.set_trace() 

if __name__ == "__main__":

    DIR_FILE = Path(__file__).parent.absolute() # project3/visualizer/src
    DIR_MAIN = DIR_FILE.parent.absolute() # project3/visualizer
    DIR_DATA = DIR_MAIN.parent.absolute() / "_data" # project3/_data

    if 1:
        DIR_CLINIC   = DIR_DATA / "trial2-CHMR"
        patientName  = "CHMR001"
        pathCT       = DIR_CLINIC / "CHMR001_ct.nii.gz"      # "nrrd_CHMR001_img1.nrrd"
        pathPT       = DIR_CLINIC / "CHMR001_pt.nii.gz"      # "nrrd_CHMR001_img2.nrrd"
        pathMask     = DIR_CLINIC / "CHMR001_gtvt.nii.gz"    # ["nrrd_CHMR001_mask.nrrd", "CHMR001_gtvt.nii.gz"]
        pathMaskPred = DIR_CLINIC / "nrrd_CHMR001_maskpred.nrrd"
    
    converterClass = DICOMConverterHecktor(patientName, pathCT, pathPT, pathMask, pathMaskPred)
    converterClass.convertToDICOM()

"""
1. pydicom_seg.MultiClassWriter
 - rows=?, cols=?
     - https://github.com/razorx89/pydicom-seg/blob/v0.4.1/pydicom_seg/writer.py#L153
 - height
     - https://github.com/razorx89/pydicom-seg/blob/v0.4.1/pydicom_seg/writer.py#L183
        - min_z, max_z = 0, segmentation.GetDepth()
 - add_frame
    - https://github.com/razorx89/pydicom-seg/blob/v0.4.1/pydicom_seg/writer.py#L193
        - slice_idx in range(min_z, max_z)
        - frame_data = np.equal( buffer[slice_idx, min_y:max_y, min_x:max_x], segment )
 - Encoding 3D Array
    - https://github.com/razorx89/pydicom-seg/blob/v0.4.1/pydicom_seg/segmentation_dataset.py#L200
"""