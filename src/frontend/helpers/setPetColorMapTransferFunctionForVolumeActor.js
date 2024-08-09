import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';

export default function setPetColorMapTransferFunctionForVolumeActor(
  volumeInfo
) {
  const { volumeActor, preset } = volumeInfo;
  const mapper = volumeActor.getMapper();
  mapper.setSampleDistance(1.0);

  const cfun = vtkColorTransferFunction.newInstance();
  let presetToUse = preset ? preset : vtkColorMaps.getPresetByName('hsv');
  cfun.applyColorMap(presetToUse);
  cfun.setMappingRange(0, 5);

  volumeActor.getProperty().setRGBTransferFunction(0, cfun);

  // Create scalar opacity function
  const ofun = vtkPiecewiseFunction.newInstance();
  // ofun.addPoint(0, 0.0);
  // ofun.addPoint(0.1, 5000);
  ofun.addPoint(5001, 20000);

  volumeActor.getProperty().setScalarOpacity(0, ofun);
}