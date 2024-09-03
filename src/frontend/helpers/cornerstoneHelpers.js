import * as config from './config.js';
import * as updateGUIElementsHelper from './updateGUIElementsHelper.js';
import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstone3DTools from '@cornerstonejs/tools';

function resetView(){
  const renderingEngine = cornerstone3D.getRenderingEngine(config.renderingEngineId);
  config.viewPortIdsAll.forEach((viewportId) => {
      const viewportTmp = renderingEngine.getViewport(viewportId);
      viewportTmp.resetCamera();
      viewportTmp.render();
  });

}

async function renderNow(){
    // return NOTE: cant do this since the left-right arrow keys wont work to change slice Id
    try {
        // console.log(cornerstone3DTools.ToolGroupManager getToolGroup(toolGroupId)
        const viewportsInfo = cornerstone3DTools.ToolGroupManager.getToolGroup(config.toolGroupIdContours).getViewportsInfo();
        viewportsInfo.forEach(({ viewportId, renderingEngineId }) => {
          const enabledElement = cornerstone3D.getEnabledElementByIds(
            viewportId,
            renderingEngineId
          );
          enabledElement.viewport.render();
        });

        updateGUIElementsHelper.setSliceIdxHTMLForAllHTML()

    } catch (error) {
        console.error('Error in renderNow():', error);
    }
}

export {resetView, renderNow}