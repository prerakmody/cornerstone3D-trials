import * as config from './config.js';
import * as updateGUIElementsHelper from './updateGUIElementsHelper.js';
import * as cornerstoneHelpers from './cornerstoneHelpers.js';
import * as cornerstone3DTools from '@cornerstonejs/tools';


function getAllPlanFreeHandRoiAnnotations() {
    const allAnnotations = cornerstone3DTools.annotation.state.getAllAnnotations();
    const planFreeHandRoiAnnotations = allAnnotations.filter(annotation => annotation.metadata.toolName === cornerstone3DTools.PlanarFreehandROITool.toolName);
    return planFreeHandRoiAnnotations;
}

async function getScribbleType() {
    const fgdCheckbox = document.getElementById(config.fgdCheckboxId);
    const bgdCheckbox = document.getElementById(config.bgdCheckboxId);
    if (fgdCheckbox.checked) return config.KEY_FGD;
    if (bgdCheckbox.checked) return config.KEY_BGD;
    return '';
}

async function handleStuffAfterProcessEndpoint(scribbleAnnotationUID){
    cornerstone3DTools.annotation.state.removeAnnotation(scribbleAnnotationUID);
    cornerstoneHelpers.renderNow();
    await updateGUIElementsHelper.unshowLoaderAnimation();
}

async function getSliceIdxinPoints3D(points3D) {
    let returnStr = 'Meh?';

    // Step 1 - Make [N,3] to [3,N]
    const transpose = (matrix) => matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));

    // Step 2 - Find unique values in each column
    const findUniqueValues = (matrix) => {
        const transposedMatrix = transpose(matrix);
        return transposedMatrix.map(column => {
            const uniqueValues = new Set(column);
            return Array.from(uniqueValues);
        });
    };

    // Step 3 - Find and return the single unique value in each column
    const colIndextoColColNames = {0: 'Sagittal', 1: 'Coronal', 2: 'Axial'};
    const printSingleUniqueValues = (matrix) => {
        const uniqueValuesInColumns = findUniqueValues(matrix);
        for (let colIndex = 0; colIndex < uniqueValuesInColumns.length; colIndex++) {
            const uniqueValues = uniqueValuesInColumns[colIndex];
            if (uniqueValues.length === 1) {
                return `Column: ${colIndextoColColNames[colIndex]}, Slice Idx: ${uniqueValues[0]}`;
            }
        }
        return 'No column has exactly one unique value';
    };

    returnStr = printSingleUniqueValues(points3D);
    return returnStr;
}

export {getAllPlanFreeHandRoiAnnotations, getScribbleType}
export {handleStuffAfterProcessEndpoint}
export {getSliceIdxinPoints3D}