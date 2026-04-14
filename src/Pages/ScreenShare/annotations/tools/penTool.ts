import { fabric } from 'fabric';
import type { AnnotationTool } from './types';

export const penTool: AnnotationTool = (fc, { strokeColor, strokeWidth, onStrokeComplete }) => {
  fc.isDrawingMode = true;
  fc.defaultCursor = 'crosshair';

  const brush = new fabric.PencilBrush(fc);
  brush.color = strokeColor;
  brush.width = strokeWidth;
  brush.strokeLineCap = 'round';
  fc.freeDrawingBrush = brush;

  const onPathCreated = () => onStrokeComplete();
  fc.on('path:created', onPathCreated);

  return () => {
    fc.off('path:created', onPathCreated);
    fc.isDrawingMode = false;
  };
};
