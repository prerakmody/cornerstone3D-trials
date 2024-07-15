import dicomParser from 'dicom-parser';
import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstone3DTools from '@cornerstonejs/tools';
import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import * as cornerstoneStreamingImageLoader from '@cornerstonejs/streaming-image-volume-loader';

import createImageIdsAndCacheMetaData from '../helpers/createImageIdsAndCacheMetaData'; // https://github.com/cornerstonejs/cornerstone3D/blob/a4ca4dde651d17e658a4aec5a4e3ec1b274dc580/utils/demo/helpers/createImageIdsAndCacheMetaData.js

//******************************************* Step 0 - Define Ids (and other configs) */

const axialID    = 'CT_AXIAL_STACK';
const sagittalID = 'CT_SAGITTAL_STACK';
const coronalID  = 'CT_CORONAL_STACK';
const viewportIds = [axialID, sagittalID, coronalID];
const viewPortDivId = 'viewportDiv';

const volumeLoaderScheme = 'cornerstoneStreamingImageVolume';
const volumeId           = `${volumeLoaderScheme}:myVolume`;

const contouringButtonDivId = 'contouringButtonDiv';
const contourSegmentationToolButtonId = 'PlanarFreehandContourSegmentationTool-Button';
const sculptorToolButtonId = 'SculptorTool-Button';
const noContouringButtonId = 'NoContouring-Button';

const DEFAULT_SEGMENTATION_CONFIG = {fillAlpha: 0.5, fillAlphaInactive: 0.3, outlineOpacity: 1, outlineOpacityInactive: 0.85, outlineWidthActive: 3, outlineWidthInactive: 1, outlineDashActive: 0, outlineDashInactive: 1,};
const segmentationId = `SEGMENTATION_ID`;
let segmentationRepresentationUID = '';
let activeSegmentIndex = 0;

const toolGroupId = 'STACK_TOOL_GROUP_ID';

//******************************************* Step 1 - Make viewport (and other) htmls */

function createViewPortsHTML() {

    const contentDiv = document.getElementById('contentDiv');

    const viewportGridDiv = document.createElement('div');
    viewportGridDiv.id = viewPortDivId;
    viewportGridDiv.style.display = 'flex';
    viewportGridDiv.style.flexDirection = 'row';
    viewportGridDiv.oncontextmenu = (e) => e.preventDefault(); // Disable right click

    // element for axial view
    const axialDiv = document.createElement('div');
    axialDiv.style.width = '500px';
    axialDiv.style.height = '500px';
    axialDiv.id = axialID;

    // element for sagittal view
    const sagittalDiv = document.createElement('div');
    sagittalDiv.style.width = '500px';
    sagittalDiv.style.height = '500px';
    sagittalDiv.id = sagittalID;

    // element for coronal view
    const coronalDiv = document.createElement('div');
    coronalDiv.style.width = '500px';
    coronalDiv.style.height = '500px';
    coronalDiv.id = coronalID;

    viewportGridDiv.appendChild(axialDiv);
    viewportGridDiv.appendChild(sagittalDiv);
    viewportGridDiv.appendChild(coronalDiv);

    contentDiv.appendChild(viewportGridDiv);

    return {contentDiv, viewportGridDiv, axialDiv, sagittalDiv, coronalDiv};
}
const {axialDiv, sagittalDiv, coronalDiv} = createViewPortsHTML();

function createContouringHTML() {

    // Step 1.0 - Get contentDiv and contouringButtonDiv
    const contentDiv = document.getElementById('contentDiv');
    const contouringButtonDiv = document.createElement('div');
    contouringButtonDiv.id = contouringButtonDivId;
    contouringButtonDiv.style.display = 'flex';
    contouringButtonDiv.style.flexDirection = 'row';

    // Step 1.1 - Create a button to enable PlanarFreehandContourSegmentationTool
    const contourSegmentationToolButton = document.createElement('button');
    contourSegmentationToolButton.id = contourSegmentationToolButtonId;
    contourSegmentationToolButton.innerHTML = 'Enable PlanarFreehandSegmentationTool';
    
    // Step 1.2 - Create a button to enable SculptorTool
    const sculptorToolButton = document.createElement('button');
    sculptorToolButton.id = sculptorToolButtonId;
    sculptorToolButton.innerHTML = 'Enable SculptorTool';
    
    // Step 1.3 - No contouring button
    const noContouringButton = document.createElement('button');
    noContouringButton.id = noContouringButtonId;
    noContouringButton.innerHTML = 'No Contouring';
    
    // Step 1.3 - Add buttons to contouringButtonDiv
    contouringButtonDiv.appendChild(contourSegmentationToolButton);
    contouringButtonDiv.appendChild(sculptorToolButton);
    contouringButtonDiv.appendChild(noContouringButton);

    // Step 1.4 - Add contouringButtonDiv to contentDiv
    contentDiv.appendChild(contouringButtonDiv); 
    
    return {noContouringButton, contourSegmentationToolButton, sculptorToolButton};

}
const {noContouringButton, contourSegmentationToolButton, sculptorToolButton} = createContouringHTML();

function setButtonBoundaryColor(button, shouldSet, color = 'red') {
    if (button instanceof HTMLElement) {
        if (shouldSet) {
            button.style.border = `2px solid ${color}`;
        } else {
            button.style.border = '';
        }
    } else {
        console.error('Provided argument is not a DOM element');
    }
}

//******************************************* Step 2 - Do segmentation stuff */ 
const {segmentation} = cornerstone3DTools;
function initializeGlobalConfig() {
    const globalSegmentationConfig = segmentation.config.getGlobalConfig();
  
    Object.assign(
      globalSegmentationConfig.representations.CONTOUR,
      DEFAULT_SEGMENTATION_CONFIG
    );
  
    segmentation.config.setGlobalConfig(globalSegmentationConfig);
}

function updateActiveSegmentIndex(segmentIndex) {
    activeSegmentIndex = segmentIndex;
    segmentation.segmentIndex.setActiveSegmentIndex(segmentationId, segmentIndex);
}

//******************************************* Step 3 - Do javascript stuff */ 
async function setup(){

    // -------------------------------------------------> Step 3.1 - Init
    // Step 3.1.1 - Init cornerstoneDICOMImageLoader
    cornerstoneDICOMImageLoader.external.cornerstone = cornerstone3D;
    cornerstoneDICOMImageLoader.external.dicomParser = dicomParser;
    cornerstone3D.volumeLoader.registerVolumeLoader('cornerstoneStreamingImageVolume',cornerstoneStreamingImageLoader.cornerstoneStreamingImageVolumeLoader);

    // Step 3.1.2 - Init cornerstone3D and cornerstone3DTools
    await cornerstone3D.init();
    await cornerstone3DTools.init();    

    // -------------------------------------------------> Step 3.2 - Do tooling stuff
    // Step 2.3.1 - Add tools to Cornerstone3D
    const windowLevelTool           = cornerstone3DTools.WindowLevelTool;
    const panTool                   = cornerstone3DTools.PanTool;
    const zoomTool                  = cornerstone3DTools.ZoomTool;
    const stackScrollMouseWheelTool = cornerstone3DTools.StackScrollMouseWheelTool;
    const probeTool                 = cornerstone3DTools.ProbeTool;
    const referenceLinesTool        = cornerstone3DTools.ReferenceLines;
    const segmentationDisplayTool               = cornerstone3DTools.SegmentationDisplayTool;
    const planarFreehandROITool                 = cornerstone3DTools.PlanarFreehandROITool;
    const planarFreehandContourSegmentationTool = cornerstone3DTools.PlanarFreehandContourSegmentationTool;
    const sculptorTool                          = cornerstone3DTools.SculptorTool;
    const toolState = cornerstone3DTools.state;
    
    cornerstone3DTools.addTool(windowLevelTool);
    cornerstone3DTools.addTool(panTool);
    cornerstone3DTools.addTool(zoomTool);
    cornerstone3DTools.addTool(stackScrollMouseWheelTool);
    cornerstone3DTools.addTool(probeTool);
    cornerstone3DTools.addTool(referenceLinesTool);
    cornerstone3DTools.addTool(segmentationDisplayTool);
    cornerstone3DTools.addTool(planarFreehandROITool);
    cornerstone3DTools.addTool(planarFreehandContourSegmentationTool);
    cornerstone3DTools.addTool(sculptorTool);
    
    // Step 2.3.2 - Make toolGroup
    const toolGroup = cornerstone3DTools.ToolGroupManager.createToolGroup(toolGroupId);
    toolGroup.addTool(windowLevelTool.toolName);
    toolGroup.addTool(panTool.toolName);
    toolGroup.addTool(zoomTool.toolName);
    toolGroup.addTool(stackScrollMouseWheelTool.toolName);
    toolGroup.addTool(probeTool.toolName);
    toolGroup.addTool(referenceLinesTool.toolName);
    toolGroup.addTool(segmentationDisplayTool.toolName);
    toolGroup.addTool(planarFreehandROITool.toolName);
    toolGroup.addTool(planarFreehandContourSegmentationTool.toolName, {displayOnePointAsCrosshairs: true, cachedStats:true});
    toolGroup.addTool(sculptorTool.toolName);

    // Step 2.3.3 - Set toolGroup elements as active/passive (after volume has been loaded)
    toolGroup.setToolPassive(windowLevelTool.toolName);// Left Click
    toolGroup.setToolActive(panTool.toolName, {bindings: [{mouseButton: cornerstone3DTools.Enums.MouseBindings.Auxiliary, },],}); // Middle Click
    toolGroup.setToolActive(zoomTool.toolName, {bindings: [{mouseButton: cornerstone3DTools.Enums.MouseBindings.Secondary, },],}); // Right Click    
    toolGroup.setToolActive(stackScrollMouseWheelTool.toolName);
    toolGroup.setToolEnabled(probeTool.toolName);
    toolGroup.setToolEnabled(referenceLinesTool.toolName);
    toolGroup.setToolConfiguration(referenceLinesTool.toolName, {sourceViewportId: axialID,});
    [axialDiv, sagittalDiv, coronalDiv].forEach((viewportDiv, index) => {
        viewportDiv.addEventListener('mouseenter', function() {
            toolGroup.setToolConfiguration(referenceLinesTool.toolName, {sourceViewportId: viewportIds[index]});
        });
    });

    toolGroup.setToolEnabled(segmentationDisplayTool.toolName);
    // toolGroup.setToolPassive(planarFreehandROITool.toolName);
    // toolGroup.setToolActive(planarFreehandContourSegmentationTool.toolName, {bindings: [{mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, },],}); // Left Click
    toolGroup.setToolPassive(planarFreehandContourSegmentationTool.toolName);
    toolGroup.setToolActive(planarFreehandROITool.toolName, {bindings: [{mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, },],}); // Left Click        
    toolGroup.setToolPassive(sculptorTool.toolName);
    console.log(' - toolState.toolGroups: ', toolState.toolGroups);
    console.log('  -- toolState: ', toolState.toolGroups[0].toolOptions);
    console.log('   -- PlanarFreehandContourSegmentationTool: ', toolState.toolGroups[0].toolOptions[planarFreehandContourSegmentationTool.toolName]);
    
    // Step 2.3.4 - Add event listeners to buttons        
    [noContouringButton, contourSegmentationToolButton, sculptorToolButton].forEach((buttonHTML, buttonId) => {
        if (buttonHTML === null) return;
        
        buttonHTML.addEventListener('click', function(evt) {
            if (buttonId === 0) {
                toolGroup.setToolPassive(sculptorTool.toolName);
                toolGroup.setToolPassive(planarFreehandContourSegmentationTool.toolName);
                toolGroup.setToolPassive(planarFreehandROITool.toolName);
                toolGroup.setToolActive(windowLevelTool.toolName, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });                    
                setButtonBoundaryColor(noContouringButton, true);
                setButtonBoundaryColor(contourSegmentationToolButton, false);
                setButtonBoundaryColor(sculptorToolButton, false);
            }
            else if (buttonId === 1) {
                toolGroup.setToolPassive(windowLevelTool.toolName);
                toolGroup.setToolPassive(sculptorTool.toolName);
                toolGroup.setToolPassive(planarFreehandROITool.toolName);
                toolGroup.setToolActive(planarFreehandContourSegmentationTool.toolName, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });
                setButtonBoundaryColor(noContouringButton, false);
                setButtonBoundaryColor(contourSegmentationToolButton, true);
                setButtonBoundaryColor(sculptorToolButton, false);
            }
            else if (buttonId === 2) {
                toolGroup.setToolPassive(windowLevelTool.toolName);
                toolGroup.setToolPassive(planarFreehandContourSegmentationTool.toolName);
                toolGroup.setToolActive(sculptorTool.toolName, [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ]);
                setButtonBoundaryColor(noContouringButton, false);
                setButtonBoundaryColor(contourSegmentationToolButton, false);
                setButtonBoundaryColor(sculptorToolButton, true);

            }
            console.log('sfadsfadsf: ', buttonId, evt)
            console.log('   -- PlanarFreehandContourSegmentationTool: ', toolState.toolGroups[0].toolOptions[planarFreehandContourSegmentationTool.toolName]);
        });

        

    });

    // -------------------------------------------------> Step 2.4 - Make rendering engine
    const renderingEngineId = 'myRenderingEngine';
    const renderingEngine = new cornerstone3D.RenderingEngine(renderingEngineId);

    // Step 2.5.1 - Add image planes to rendering engine
    const viewportInputs = [
        {element: axialDiv   , viewportId: axialID   , type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.AXIAL},},
        {element: sagittalDiv, viewportId: sagittalID, type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.SAGITTAL},},
        {element: coronalDiv , viewportId: coronalID , type: cornerstone3D.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: cornerstone3D.Enums.OrientationAxis.CORONAL},},
    ]
    renderingEngine.setViewports(viewportInputs);
    
    // Step 2.5.2 - Add toolGroup to rendering engine
    viewportIds.forEach((viewportId) =>
        toolGroup.addViewport(viewportId, renderingEngineId)
    );
    

    // -------------------------------------------------> Step 2.5 - Get .dcm data
    const dicomDownloadButton = document.getElementById('dicomDownload')
    // dicomDownloadButton.addEventListener('click', async function() {
        // Step 2.5.1 - Debug
        console.log(' \n ----------------- Getting .dcm data ----------------- \n')

        // Step 2.5.2 - get WADO image Ids
        const searchObj = {
          StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
          SeriesInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561',
          wadoRsRoot: 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
        }
        // (Try in postman) http://localhost:8042/dicom-web/studies/1.3.6.1.4.1.14519.5.2.1.7311.5101.170561193612723093192571245493/series/1.3.6.1.4.1.14519.5.2.1.7311.5101.206828891270520544417996275680/metadata 
        // imageIds[0] = // wadors:https://d3t6nz73ql33tx.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463/series/1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561/instances/1.3.6.1.4.1.14519.5.2.1.7009.2403.811199116755887922789178901449/frames/1
        // const searchObj = {
        //   StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7311.5101.170561193612723093192571245493',
        //   SeriesInstanceUID:'1.3.6.1.4.1.14519.5.2.1.7311.5101.206828891270520544417996275680',
        //   wadoRsRoot: `${window.location.origin}/dicom-web`,
        // }
        console.log(searchObj);
        const imageIds = await createImageIdsAndCacheMetaData(searchObj);
        
        // Step 2.5.3 - Create volume
        const volume = await cornerstone3D.volumeLoader.createAndCacheVolume(volumeId, { imageIds });
        volume.load();
        await cornerstone3D.setVolumesForViewports(renderingEngine, [{ volumeId }], viewportIds);

        ////////////////////////////////////////////////////// Step 2.5.3 - render image
        renderingEngine.renderViewports(viewportIds);
        
        //////////////////////// Step 2.5.4 - Deal with segmentations
        // Step 1 - Add the segmentations to state
        segmentation.addSegmentations([
            {segmentationId,representation: {type: cornerstone3DTools.Enums.SegmentationRepresentations.Contour,},},
            // {segmentationId,representation: {type: cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap,},},
        ]);
        
        // Step 2 - Create a segmentation representation associated to the toolGroupId
        const segmentationRepresentationUIDs = await segmentation.addSegmentationRepresentations(toolGroupId, [
            {segmentationId, type: cornerstone3DTools.Enums.SegmentationRepresentations.Contour,},
            // {segmentationId, type: cornerstone3DTools.Enums.SegmentationRepresentations.Labelmap,},
        ]);
        
        // Step 3 - Make the segmentation created as the active one
        segmentationRepresentationUID = segmentationRepresentationUIDs[0];
        segmentation.activeSegmentation.setActiveSegmentationRepresentation(toolGroupId,segmentationRepresentationUID);
        segmentation.segmentIndex.setActiveSegmentIndex(segmentationId, 1);
        updateActiveSegmentIndex(1);
        initializeGlobalConfig();
        renderingEngine.render()
    // })
}


setup()



/**
TO-DO
1. [P] Volume scrolling using left-right arrow
2. [D] Contour making tool (using a select button)
2.1 [D] Labelmap making tool (Ref: https://www.cornerstonejs.org/live-examples/labelmapsegmentationtools for brush eraser)
3. [Part D] Contour sculpting tool (using a select button)
4. [P] RTStruct loading tool (from dicomweb)

REFERENCES
 - To change slideId in volumeViewport: https://github.com/cornerstonejs/cornerstone3D/issues/1307
 - More segmentation examples: https://deploy-preview-1205--cornerstone-3d-docs.netlify.app/live-examples/segmentationstack
 - SegmentationDisplayTool is to display the segmentation on the viewport
    - https://github.com/cornerstonejs/cornerstone3D/blob/main/packages/tools/src/tools/displayTools/SegmentationDisplayTool.ts
        - currently only supports LabelMap


OTHER NOTES
 - docker run -p 4242:4242 -p 8042:8042 -p 8081:8081 -p 8082:8082 -v tmp:/etc/orthanc -v orthanc-db:/var/lib/orthanc/db/ -v node-data:/root orthanc-plugins-withnode:v1
*/