import dicomParser from 'dicom-parser';
import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstone3DTools from '@cornerstonejs/tools';
import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import * as cornerstoneStreamingImageLoader from '@cornerstonejs/streaming-image-volume-loader';

import createImageIdsAndCacheMetaData from '../helpers/createImageIdsAndCacheMetaData'; // https://github.com/cornerstonejs/cornerstone3D/blob/a4ca4dde651d17e658a4aec5a4e3ec1b274dc580/utils/demo/helpers/createImageIdsAndCacheMetaData.js

// This is for debugging purposes
console.warn('Click on index.ts to open source code for this example --------->');

const DEFAULT_SEGMENTATION_CONFIG = {fillAlpha: 0.5, fillAlphaInactive: 0.3, outlineOpacity: 1, outlineOpacityInactive: 0.85, outlineWidthActive: 3, outlineWidthInactive: 1, outlineDashActive: 0, outlineDashInactive: 1,};

// Define a unique id for the volume
const volumeName         = 'CT_VOLUME_ID'; // Id of the volume less loader prefix
const volumeLoaderScheme = 'cornerstoneStreamingImageVolume'; // Loader id which defines which volume loader to use
const volumeId           = `${volumeLoaderScheme}:${volumeName}`; // VolumeId with loader id + volume id
const renderingEngineId  = 'myRenderingEngine';
const viewportIds        = ['CT_VOLUME_AXIAL', 'CT_VOLUME_SAGITTAL', 'CT_VOLUME_CORONAL'];
const toolGroupId        = 'STACK_TOOL_GROUP_ID';

const segmentationId = `SEGMENTATION_ID`;
let segmentationRepresentationUID = '';
let activeSegmentIndex = 0;

const size = '500px';
const content = document.getElementById('contentDiv');
const viewportGrid = document.createElement('div');

viewportGrid.style.display = 'flex';
viewportGrid.style.display = 'flex';
viewportGrid.style.flexDirection = 'row';

const element1 = document.createElement('div');
const element2 = document.createElement('div');
const element3 = document.createElement('div');
element1.style.width = size;
element1.style.height = size;
element2.style.width = size;
element2.style.height = size;
element3.style.width = size;
element3.style.height = size;

// Disable right click context menu so we can have right click tool
element1.oncontextmenu = (e) => e.preventDefault();
element2.oncontextmenu = (e) => e.preventDefault();
element3.oncontextmenu = (e) => e.preventDefault();

viewportGrid.appendChild(element1);
viewportGrid.appendChild(element2);
viewportGrid.appendChild(element3);

content.appendChild(viewportGrid);


function updateActiveSegmentIndex(segmentIndex){
  activeSegmentIndex = segmentIndex;
  segmentation.segmentIndex.setActiveSegmentIndex(segmentationId, segmentIndex);
}

const {segmentation} = cornerstone3DTools;
function initializeGlobalConfig() {
  const globalSegmentationConfig = segmentation.config.getGlobalConfig();

  Object.assign(
    globalSegmentationConfig.representations.CONTOUR,
    DEFAULT_SEGMENTATION_CONFIG
  );

  segmentation.config.setGlobalConfig(globalSegmentationConfig);
}



/**
 * Runs the demo
 */
async function run() {

    // -------------------------------------------------> Step 2.1 - Init
    // Init Cornerstone and related libraries
    cornerstoneDICOMImageLoader.external.cornerstone = cornerstone3D;
    cornerstoneDICOMImageLoader.external.dicomParser = dicomParser;
    cornerstone3D.volumeLoader.registerVolumeLoader('cornerstoneStreamingImageVolume',cornerstoneStreamingImageLoader.cornerstoneStreamingImageVolumeLoader);
    await cornerstone3D.init()
    await cornerstone3DTools.init();
    
    // -------------------------------------------------> Step 2.2 - Do tooling stuff
    const windowLevelTool = cornerstone3DTools.WindowLevelTool;
    const panTool         = cornerstone3DTools.PanTool;
    const zoomTool        = cornerstone3DTools.ZoomTool;
    const stackScrollMouseWheelTool = cornerstone3DTools.StackScrollMouseWheelTool;
    const probeTool          = cornerstone3DTools.ProbeTool;
    const referenceLinesTool = cornerstone3DTools.ReferenceLines;
    const segmentationDisplayTool = cornerstone3DTools.SegmentationDisplayTool;
    const planarFreehandContourSegmentationTool = cornerstone3DTools.PlanarFreehandContourSegmentationTool;
    const sculptorTool                          = cornerstone3DTools.SculptorTool;
    
    cornerstone3DTools.addTool(windowLevelTool);
    cornerstone3DTools.addTool(panTool);
    cornerstone3DTools.addTool(zoomTool);
    cornerstone3DTools.addTool(stackScrollMouseWheelTool);
    cornerstone3DTools.addTool(probeTool);
    cornerstone3DTools.addTool(referenceLinesTool);
    cornerstone3DTools.addTool(segmentationDisplayTool);
    cornerstone3DTools.addTool(planarFreehandContourSegmentationTool);
    cornerstone3DTools.addTool(sculptorTool);
  
    const toolGroup = cornerstone3DTools.ToolGroupManager.createToolGroup(toolGroupId);
    toolGroup.addTool(windowLevelTool.toolName);
    toolGroup.addTool(panTool.toolName);
    toolGroup.addTool(zoomTool.toolName);
    toolGroup.addTool(stackScrollMouseWheelTool.toolName);
    toolGroup.addTool(probeTool.toolName);
    toolGroup.addTool(referenceLinesTool.toolName);
    toolGroup.addTool(segmentationDisplayTool.toolName);
    // toolGroup.addTool(planarFreehandContourSegmentationTool.toolName, {cachedStats:true});
    toolGroup.addTool(planarFreehandContourSegmentationTool.toolName, {displayOnePointAsCrosshairs: true});
    toolGroup.addTool(sculptorTool.toolName);

    // Set the initial state of the tools.
    toolGroup.setToolActive(planarFreehandContourSegmentationTool.toolName, {bindings: [{mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, },],});// Left Click
    toolGroup.setToolActive(zoomTool.toolName, {bindings: [{mouseButton: cornerstone3DTools.Enums.MouseBindings.Secondary, },],}); // Right Click
    toolGroup.setToolActive(panTool.toolName, {bindings: [{mouseButton: cornerstone3DTools.Enums.MouseBindings.Auxiliary, },],}); // Middle Click
    toolGroup.setToolActive(stackScrollMouseWheelTool.toolName);
    toolGroup.setToolEnabled(referenceLinesTool.toolName);
    toolGroup.setToolConfiguration(referenceLinesTool.toolName, {sourceViewportId: viewportIds[0]});
    // console.log(' - viewportIds: ', viewportIds);
    [element1, element2, element3].forEach((viewportDiv, index) => {
        viewportDiv.addEventListener('mouseenter', function() {
            toolGroup.setToolConfiguration(referenceLinesTool.toolName, {sourceViewportId: viewportIds[index]});
        });
    });
    toolGroup.setToolEnabled(segmentationDisplayTool.toolName);
    
    const volumeImageIds = await createImageIdsAndCacheMetaData({StudyInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',SeriesInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561',wadoRsRoot: 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',});
  
    // Instantiate a rendering engine
    const renderingEngine = new cornerstone3D.RenderingEngine(renderingEngineId);
  
    // Create a stack and a volume viewport
    const viewportInputArray = [
        {viewportId: viewportIds[0],type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC,element: element1,defaultOptions: {orientation: cornerstone3D.Enums.OrientationAxis.AXIAL,},},
        {viewportId: viewportIds[1],type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC,element: element2,defaultOptions: {orientation: cornerstone3D.Enums.OrientationAxis.SAGITTAL,},},
        {viewportId: viewportIds[2],type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC,element: element3,defaultOptions: {orientation: cornerstone3D.Enums.OrientationAxis.CORONAL,},},
    ];
    console.log(' - viewportInputArray: ', viewportInputArray);
  
    renderingEngine.setViewports(viewportInputArray);
  
    // Set the tool group on the viewport
    viewportIds.forEach((viewportId) =>
      toolGroup.addViewport(viewportId, renderingEngineId)
    );
  
    // Define a volume in memory
    const volume = await cornerstone3D.volumeLoader.createAndCacheVolume(volumeId, {
      imageIds: volumeImageIds,
    });
  
    // Set the volume to load
    volume.load();
  
    // // Set the volume on the viewport
    // volumeViewport.setVolumes([{ volumeId }]);
    await cornerstone3D.setVolumesForViewports(renderingEngine, [{ volumeId }], viewportIds);
  
    // Render the image
    renderingEngine.renderViewports(viewportIds);
    
    await cornerstone3D.volumeLoader.createAndCacheDerivedSegmentationVolume(volumeId, {volumeId: segmentationId,});
    segmentation.addSegmentations([
      {
        segmentationId,
        representation: {
          type: cornerstone3DTools.Enums.SegmentationRepresentations.Contour,
          data: { volumeId: segmentationId, },
        },
      },
    ]);
  
    // Create a segmentation representation associated to the toolGroupId
    const segmentationRepresentationUIDs =
      await segmentation.addSegmentationRepresentations(toolGroupId, [
        {
          segmentationId,
          type: cornerstone3DTools.Enums.SegmentationRepresentations.Contour,
        },
      ]);
  
    // Store the segmentation representation that was just created
    segmentationRepresentationUID = segmentationRepresentationUIDs[0];
  
    // Make the segmentation created as the active one
    segmentation.activeSegmentation.setActiveSegmentationRepresentation(
      toolGroupId,
      segmentationRepresentationUID
    );
  
    segmentation.segmentIndex.setActiveSegmentIndex(segmentationId, 1);
  
    updateActiveSegmentIndex(1);
    initializeGlobalConfig();
  }
  
  run();
  