// ************************************************** Init
import * as dockerNames from 'docker-names'
export const instanceName = dockerNames.getRandomName()
console.log(' ------------ instanceName: ', instanceName)

// ************************************************** HTML ids (specific to cornerstone3D)
export const HTML_CLASS_CORNERSTONE_CANVAS = 'cornerstone-canvas'

// ************************************************** HTML ids

export const viewWidthPerc = 0.28

// Viewport ids
export const contentDivId            = 'contentDiv';
export const viewportDivId           = 'viewportDiv';
export const viewPortCTDivId         = 'viewportCTDiv';
export const viewPortPTDivId         = 'viewportPTDiv';
export const axialID                 = 'ViewPortId-Axial';
export const sagittalID              = 'ViewPortId-Sagittal';
export const coronalID               = 'ViewPortId-Coronal';
export const axialPTID               = 'ViewPortId-AxialPT';
export const sagittalPTID            = 'ViewPortId-SagittalPT';
export const coronalPTID             = 'ViewPortId-CoronalPT';
export const viewportIds             = [axialID, sagittalID, coronalID];
export const viewPortPTIds           = [axialPTID, sagittalPTID, coronalPTID];
export const viewPortIdsAll          = viewportIds.concat(viewPortPTIds);

export const otherButtonsDivId       = 'otherButtonsDiv';

export const KEY_AXIAL    = 'Axial'
export const KEY_CORONAL  = 'Coronal'
export const KEY_SAGITTAL = 'Sagittal'

export let viewportGridDiv, viewportCTGridDiv, viewportPTGridDiv;
export let viewPortDivsCT, viewPortDivsPT, viewPortDivsAll, axialDiv, sagittalDiv, coronalDiv, axialDivPT, sagittalDivPT, coronalDivPT;
export let serverStatusDiv, serverStatusCircle, serverStatusTextDiv;
export let axialSliceDiv, sagittalSliceDiv, coronalSliceDiv, axialSliceDivPT, sagittalSliceDivPT, coronalSliceDivPT;

export let KEY_SERVER_STATUS_LOADED    = 'loaded';
export let KEY_SERVER_STATUS_NOTLOADED = 'notloaded';
export let serverStatus=KEY_SERVER_STATUS_NOTLOADED;
export function setServerStatus(status) { serverStatus = status; }

export let mouseHoverDiv, canvasPosHTML, ctValueHTML, ptValueHTML;

export function setViewportGridDiv(div) { viewportGridDiv = div; }
export function setViewportCTGridDiv(div) { viewportCTGridDiv = div; }
export function setViewportPTGridDiv(div) { viewportPTGridDiv = div; }
export function setAxialDiv(div) { axialDiv = div; }
export function setSagittalDiv(div) { sagittalDiv = div; }
export function setCoronalDiv(div) { coronalDiv = div; }
export function setAxialDivPT(div) { axialDivPT = div; }
export function setSagittalDivPT(div) { sagittalDivPT = div; }
export function setCoronalDivPT(div) { coronalDivPT = div; }
export function setViewPortDivsAll(divs) { viewPortDivsAll = divs; }
export function setViewPortDivsCT(divs) { viewPortDivsCT = divs; }
export function setViewPortDivsPT(divs) { viewPortDivsPT = divs; }

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
export function setMouseHoverDiv(div) { mouseHoverDiv = div; }
export function setCanvasPosHTML(html) { canvasPosHTML = html; }
export function setCTValueHTML(html) { ctValueHTML = html; }
export function setPTValueHTML(html) { ptValueHTML = html; }

// User credentials
export const USERROLE_EXPERT = 'Expert';
export const USERROLE_NONEXPERT = 'NonExpert';
export let userCredFirstName, userCredLastName, userCredRole;
export function setUserCredFirstName(name) { userCredFirstName = name; }
export function setUserCredLastName(name) { userCredLastName = name; }
export function setUserCredRole(role) { userCredRole = role; }

// Server status
export const serverHealthDivId = 'serverHealthDivId';
export let serverHealthDiv;
export function setServerHealthDiv(div) { serverHealthDiv = div; }

// Thumbnail Container
export const thumbnailContainerDivId = 'thumbnailContainerDiv';
export let thumbnailContainerDiv;
export function setThumbnailContainerDiv(div) { thumbnailContainerDiv = div; }

// Button ids

export let windowLevelButton,contourSegmentationToolButton,sculptorToolButton,editBaseContourViaScribbleButton,fgdCheckbox,bgdCheckbox
export function setWindowLevelButton(button) { windowLevelButton = button; }
export function setContourSegmentationToolButton(button) { contourSegmentationToolButton = button; }
export function setSculptorToolButton(button) { sculptorToolButton = button; }
export function setEditBaseContourViaScribbleButton(button) { editBaseContourViaScribbleButton = button; }
export function setFgdCheckbox(checkbox) { fgdCheckbox = checkbox; }
export function setBgdCheckbox(checkbox) { bgdCheckbox = checkbox; }

export const interactionButtonsDivId = 'interactionButtonsDiv'
export const contouringButtonDivId           = 'contouringButtonDiv';
export const contourSegmentationToolButtonId = 'PlanarFreehandContourSegmentationTool-Button';
export const sculptorToolButtonId            = 'SculptorTool-Button';
export const windowLevelButtonId             = 'WindowLevelTool-Button';
export const fgdCheckboxId = 'fgdCheckbox';
export const bgdCheckboxId = 'bgdCheckbox';
export const KEY_FGD = 'fgd'
export const KEY_BGD = 'bgd'

// Other HTML ids
export const loaderDivId = 'loaderDiv';
export const grayOutDivId = 'grayOutDiv';
export const loadingIndicatorDivId = 'loadingIndicatorDiv';

// ************************************************** Cornerstone3D ids

// Tools
export const strBrushCircle = 'circularBrush';
export const strEraserCircle = 'circularEraser';
export const INIT_BRUSH_SIZE = 5

// Tools
export const MODE_ACTIVE  = 'Active';
export const MODE_PASSIVE = 'Passive';
export const MODE_ENABLED = 'Enabled';
export const MODE_DISABLED = 'Disabled';

// Rendering + ToolGroup Ids
export const renderingEngineId        = 'myRenderingEngine';
export const toolGroupIdContours      = 'MY_TOOL_GROUP_ID_CONTOURS';
export const toolGroupIdScribble      = 'MY_TOOL_GROUP_ID_SCRIBBLE'; // not in use, failed experiment: Multiple tool groups found for renderingEngineId: myRenderingEngine and viewportId: ViewPortId-Axial. You should only have one tool group per viewport in a renderingEngine.
export const toolGroupIdAll           = [toolGroupIdContours, toolGroupIdScribble];

// ************************************************** Other constants

// Colors
export const COLOR_RGB_FGD = 'rgb(218, 165, 32)' // 'goldenrod'
export const COLOR_RGB_BGD = 'rgb(0, 0, 255)'    // 'blue'
export const COLOR_RGBA_ARRAY_GREEN = [0  , 255, 0, 128]   // 'green'
export const COLOR_RGBA_ARRAY_RED   = [255, 0  , 0, 128]     // 'red'
export const COLOR_RGBA_ARRAY_PINK  = [255, 192, 203, 128] // 'pink'

// Masks
export const MASK_TYPE_GT   = 'GT';
export const MASK_TYPE_PRED = 'PRED';
export const MASK_TYPE_REFINE = 'REFINE';

// Modality
export const MODALITY_CT = 'CT';
export const MODALITY_MR = 'MR';
export const MODALITY_PT = 'PT';
export const MODALITY_SEG      = 'SEG';
export const MODALITY_RTSTRUCT = 'RTSTRUCT';
export let MODALITY_CONTOURS;
export function setModalityContours(modality) { MODALITY_CONTOURS = modality; }

// Segmentation types
export const SEG_TYPE_LABELMAP = 'LABELMAP'
export const SEG_TYPE_CONTOUR  = 'CONTOUR'

// Shortcuts
export const SHORTCUT_KEY_C     = 'c';
export const SHORTCUT_KEY_F     = 'f';
export const SHORTCUT_KEY_B     = 'b';
export const SHORTCUT_KEY_ESC   = 'Escape';
export const SHORTCUT_KEY_R     = 'r';
export const SHORTCUT_KEY_PLUS  = '+';
export const SHORTCUT_KEY_MINUS = '-';
export const SHORTCUT_KEY_ARROW_LEFT = 'ArrowLeft';
export const SHORTCUT_KEY_ARROW_RIGHT = 'ArrowRight';

// MOUSE EVENTS
export const MOUSE_EVENT_WHEEL = 'wheel';
export const MOUSE_EVENT_MOUSEUP = 'mouseup';
export const MOUSE_EVENT_MOUSEMOVE = 'mousemove';
export const MOUSE_EVENT_CLICK = 'click';


// ************************************************** Network constants

// Python server
export const URL_PYTHON_SERVER = `${window.location.origin}`.replace('50000', '55000') //[`${window.location.origin}`, 'https://localhost:55000']
export const ENDPOINT_PREPARE  = '/prepare'
export const ENDPOINT_PROCESS  = '/process'
export const KEY_DATA          = 'data'
export const KEY_IDENTIFIER    = 'identifier'
export const KEY_USER          = 'user'
export const KEY_POINTS_3D     = 'points3D'
export const KEY_SCRIB_TYPE    = 'scribbleType'
export const KEY_CASE_NAME     = 'caseName'
export const KEY_VIEW_TYPE     = 'viewType'
export const METHOD_POST       = 'POST'
export const METHOD_GET        = 'GET'
export const HEADERS_JSON      = {'Content-Type': 'application/json',}

export const ENDPOINT_SERVER_HEALTH = '/serverHealth'

// Orthanc server
export const URL_ROOT = `${window.location.origin}`;
export const KEY_ORTHANC_ID          = 'OrthancId';
export const KEY_STUDIES             = 'Studies';
export const KEY_SERIES              = 'Series';
export const KEY_STUDIES_ORTHANC_ID  = 'StudiesOrthancId';
export const KEY_SERIES_ORTHANC_ID   = 'SeriesOrthancId';
export const KEY_INSTANCE_ORTHANC_ID = 'InstanceOrthancId';
export const KEY_STUDY_UID     = 'StudyUID';
export const KEY_SERIES_UID    = 'SeriesUID';
export const KEY_INSTANCE_UID  = 'InstanceUID';
export const KEY_MODALITY      = 'Modality';
export const KEY_SERIES_DESC   = 'SeriesDescription';

// ************************************************** Data constants

// Volume constants
export const volumeLoaderScheme   = 'cornerstoneStreamingImageVolume';
export const volumeIdPETBase      = `${volumeLoaderScheme}:myVolumePET`; //+ cornerstone3D.utilities.uuidv4()
export const volumeIdCTBase       = `${volumeLoaderScheme}:myVolumeCT`;

// Segmentation constants
export const scribbleSegmentationIdBase = `SCRIBBLE_SEGMENTATION_ID`; // this should not change for different scribbles
export const gtSegmentationIdBase   = ["LOAD_SEGMENTATION_ID", MASK_TYPE_GT].join('::') 
export const predSegmentationIdBase = ["LOAD_SEGMENTATION_ID", MASK_TYPE_PRED].join('::')

// ************************************************** Data vars

// Volume vars
export let volumeIdCT;
export let volumeIdPET;
export function setVolumeIdCT(id) { volumeIdCT = id; }
export function setVolumeIdPET(id) { volumeIdPET = id; }

export let imageIdsCT;
export function setImageIdsCT(ids) { 
    // console.log(' - [setImageIdsCT()]: ids[0]', ids[0])
    imageIdsCT = ids; 
}

// Segmentation vars
export let scribbleSegmentationId;
export let scribbleSegmentationUIDs;
export let gtSegmentationId
export let gtSegmentationUIDs;
export let predSegmentationId;
export let predSegmentationUIDs;
export function setScribbleSegmentationId(id) { scribbleSegmentationId = id; }
export function setScribbleSegmentationUIDs(uids) { scribbleSegmentationUIDs = uids; }
export function setGtSegmentationId(id) { gtSegmentationId = id; }
export function setGtSegmentationUIDs(uids) { gtSegmentationUIDs = uids; }
export function setPredSegmentationId(id) { predSegmentationId = id; }
export function setPredSegmentationUIDs(uids) { predSegmentationUIDs = uids; }

// Slice vars
export let globalSliceIdxVars = {axialSliceIdxHTML:-1   , axialSliceIdxViewportReference:-1   , axialViewPortReference: {}, axialCamera: {}
                                , sagittalSliceIdxHTML:-1, sagittalSliceIdxViewportReference:-1, sagittalViewportReference: {}, sagittalCamera: {}
                                , coronalSliceIdxHTML:-1 , coronalSliceIdxViewportReference:-1 , coronalViewportReference:{}, coronalCamera: {}
                                , axialSliceIdxHTMLPT:-1   , axialSliceIdxViewportReferencePT:-1   , axialViewPortReferencePT: {}, axialCameraPT: {}
                                , sagittalSliceIdxHTMLPT:-1, sagittalSliceIdxViewportReferencePT:-1, sagittalViewportReferencePT: {}, sagittalCameraPT: {}
                                , coronalSliceIdxHTMLPT:-1 , coronalSliceIdxViewportReferencePT:-1 , coronalViewportReferencePT:{}, coronalCameraPT: {}
                                };

// Patient vars 
export let orthanDataURLS = [];
export function setOrthanDataURLS(data) { orthanDataURLS = data; }

export let patientIdx;
export function setPatientIdx(idx) { patientIdx = idx; }