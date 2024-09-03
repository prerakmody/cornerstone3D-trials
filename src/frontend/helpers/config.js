// ************************************************** HTML ids
// Viewport ids
export const contentDivId            = 'contentDiv';
export const axialID                 = 'ViewPortId-Axial';
export const sagittalID              = 'ViewPortId-Sagittal';
export const coronalID               = 'ViewPortId-Coronal';
export const axialPTID               = 'ViewPortId-AxialPT';
export const sagittalPTID            = 'ViewPortId-SagittalPT';
export const coronalPTID             = 'ViewPortId-CoronalPT';
export const viewportIds             = [axialID, sagittalID, coronalID];
export const viewPortPTIds           = [axialPTID, sagittalPTID, coronalPTID];
export const viewPortIdsAll          = viewportIds.concat(viewPortPTIds);
export const viewPortDivId           = 'viewportDiv';
export const viewPortPTDivId         = 'viewportPTDiv';
export const otherButtonsDivId       = 'otherButtonsDiv';

export let viewportGridDiv=null, viewportPTGridDiv=null;
export let axialDiv, sagittalDiv, coronalDiv, axialDivPT, sagittalDivPT, coronalDivPT;
export let serverStatusDiv, serverStatusCircle, serverStatusTextDiv;
export let axialSliceDiv, sagittalSliceDiv, coronalSliceDiv, axialSliceDivPT, sagittalSliceDivPT, coronalSliceDivPT;

export function getViewportGridDiv() { return viewportGridDiv; }
export function getViewportPTGridDiv() { return viewportPTGridDiv; }
export function setViewportGridDiv(div) { viewportGridDiv = div; }
export function setViewportPTGridDiv(div) { viewportPTGridDiv = div; }
export function getAxialDiv() { return axialDiv; }
export function getSagittalDiv() { return sagittalDiv; }
export function getCoronalDiv() { return coronalDiv; }
export function getAxialDivPT() { return axialDivPT; }
export function getSagittalDivPT() { return sagittalDivPT; }
export function getCoronalDivPT() { return coronalDivPT; }
export function setAxialDiv(div) { axialDiv = div; }
export function setSagittalDiv(div) { sagittalDiv = div; }
export function setCoronalDiv(div) { coronalDiv = div; }
export function setAxialDivPT(div) { axialDivPT = div; }
export function setSagittalDivPT(div) { sagittalDivPT = div; }
export function setCoronalDivPT(div) { coronalDivPT = div; }
export function getServerStatusDiv() { return serverStatusDiv; }
export function getServerStatusCircle() { return serverStatusCircle; }
export function getServerStatusTextDiv() { return serverStatusTextDiv; }
export function setServerStatusDiv(div) { serverStatusDiv = div; }
export function setServerStatusCircle(circle) { serverStatusCircle = circle; }
export function setServerStatusTextDiv(div) { serverStatusTextDiv = div; }
export function getAxialSliceDiv() { return axialSliceDiv; }
export function getSagittalSliceDiv() { return sagittalSliceDiv; }
export function getCoronalSliceDiv() { return coronalSliceDiv; }
export function getAxialSliceDivPT() { return axialSliceDivPT; }
export function getSagittalSliceDivPT() { return sagittalSliceDivPT; }
export function getCoronalSliceDivPT() { return coronalSliceDivPT; }
export function setAxialSliceDiv(div) { axialSliceDiv = div; }
export function setSagittalSliceDiv(div) { sagittalSliceDiv = div; }
export function setCoronalSliceDiv(div) { coronalSliceDiv = div; }
export function setAxialSliceDivPT(div) { axialSliceDivPT = div; }
export function setSagittalSliceDivPT(div) { sagittalSliceDivPT = div; }
export function setCoronalSliceDivPT(div) { coronalSliceDivPT = div; }

// Button ids
export const interactionButtonsDivId = 'interactionButtonsDiv'

export const contouringButtonDivId           = 'contouringButtonDiv';
export const contourSegmentationToolButtonId = 'PlanarFreehandContourSegmentationTool-Button';
export const sculptorToolButtonId            = 'SculptorTool-Button';
export const windowLevelButtonId             = 'WindowLevelTool-Button';

// Tools
export const strBrushCircle = 'circularBrush';
export const strEraserCircle = 'circularEraser';

// Rendering + Volume + Segmentation ids
export const renderingEngineId        = 'myRenderingEngine';
export const toolGroupIdContours      = 'MY_TOOL_GROUP_ID_CONTOURS';
export const toolGroupIdScribble      = 'MY_TOOL_GROUP_ID_SCRIBBLE'; // not in use, failed experiment: Multiple tool groups found for renderingEngineId: myRenderingEngine and viewportId: ViewPortId-Axial. You should only have one tool group per viewport in a renderingEngine.
export const toolGroupIdAll           = [toolGroupIdContours, toolGroupIdScribble];
export const volumeLoaderScheme       = 'cornerstoneStreamingImageVolume';
export const volumeIdPETBase      = `${volumeLoaderScheme}:myVolumePET`; //+ cornerstone3D.utilities.uuidv4()
export const volumeIdCTBase       = `${volumeLoaderScheme}:myVolumeCT`;
// let volumeIdCT;
// let volumeIdPET;

// Colors
export const COLOR_RGB_FGD = 'rgb(218, 165, 32)' // 'goldenrod'
export const COLOR_RGB_BGD = 'rgb(0, 0, 255)'    // 'blue'
export const COLOR_RGBA_ARRAY_GREEN = [0  , 255, 0, 128]   // 'green'
export const COLOR_RGBA_ARRAY_RED   = [255, 0  , 0, 128]     // 'red'
export const COLOR_RGBA_ARRAY_PINK  = [255, 192, 203, 128] // 'pink'

export const MASK_TYPE_GT   = 'GT';
export const MASK_TYPE_PRED = 'PRED';
export const MASK_TYPE_REFINE = 'REFINE';

export const MODALITY_CT = 'CT';
export const MODALITY_MR = 'MR';
export const MODALITY_PT = 'PT';
export const MODALITY_SEG      = 'SEG';
export const MODALITY_RTSTRUCT = 'RTSTRUCT';
let MODALITY_CONTOURS;
export const INIT_BRUSH_SIZE = 5

export const scribbleSegmentationIdBase = `SCRIBBLE_SEGMENTATION_ID`; // this should not change for different scribbles

export const gtSegmentationIdBase   = ["LOAD_SEGMENTATION_ID", MASK_TYPE_GT].join('::') 
export const predSegmentationIdBase = ["LOAD_SEGMENTATION_ID", MASK_TYPE_PRED].join('::')
// let scribbleSegmentationId;
// let scribbleSegmentationUIDs;
// let gtSegmentationId
// let gtSegmentationUIDs;
// let predSegmentationId;
// let predSegmentationUIDs;

export const SEG_TYPE_LABELMAP = 'LABELMAP'
export const SEG_TYPE_CONTOUR  = 'CONTOUR'

// Python server
// export const PYTHON_SERVER_CERT        = fs.readFileSync('../backend/hostCert.pem')
// export const PYTHON_SERVER_HTTPSAGENT = new https.Agent({ ca: PYTHON_SERVER_CERT })
export const URL_PYTHON_SERVER = `${window.location.origin}`.replace('50000', '55000') //[`${window.location.origin}`, 'https://localhost:55000']
export const ENDPOINT_PREPARE  = '/prepare'
export const ENDPOINT_PROCESS  = '/process'
export const KEY_DATA          = 'data'
export const KEY_IDENTIFIER    = 'identifier'
export const KEY_POINTS_3D     = 'points3D'
export const KEY_SCRIB_TYPE    = 'scribbleType'
export const KEY_CASE_NAME     = 'caseName'
export const METHOD_POST       = 'POST'
export const HEADERS_JSON      = {'Content-Type': 'application/json',}

export const KEY_FGD = 'fgd'
export const KEY_BGD = 'bgd'

// Tools
export const MODE_ACTIVE  = 'Active';
export const MODE_PASSIVE = 'Passive';
export const MODE_ENABLED = 'Enabled';
export const MODE_DISABLED = 'Disabled';
export const SHORTCUT_KEY_C = 'c';
export const SHORTCUT_KEY_ARROW_LEFT = 'ArrowLeft';
export const SHORTCUT_KEY_ARROW_RIGHT = 'ArrowRight';

export let globalSliceIdxVars = {axialSliceIdxHTML:-1   , axialSliceIdxViewportReference:-1   , axialViewPortReference: {}, axialCamera: {}
                                , sagittalSliceIdxHTML:-1, sagittalSliceIdxViewportReference:-1, sagittalViewportReference: {}, sagittalCamera: {}
                                , coronalSliceIdxHTML:-1 , coronalSliceIdxViewportReference:-1 , coronalViewportReference:{}, coronalCamera: {}
                                , axialSliceIdxHTMLPT:-1   , axialSliceIdxViewportReferencePT:-1   , axialViewPortReferencePT: {}, axialCameraPT: {}
                                , sagittalSliceIdxHTMLPT:-1, sagittalSliceIdxViewportReferencePT:-1, sagittalViewportReferencePT: {}, sagittalCameraPT: {}
                                , coronalSliceIdxHTMLPT:-1 , coronalSliceIdxViewportReferencePT:-1 , coronalViewportReferencePT:{}, coronalCameraPT: {}
                                };

