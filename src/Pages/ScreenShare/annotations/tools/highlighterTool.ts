import { fabric } from 'fabric';
import { hexToRgba } from '../utils/hexToRgba';
import type { AnnotationTool } from './types';

export const highlighterTool: AnnotationTool = (fc, { strokeColor, strokeWidth, onStrokeComplete }) => {
  fc.isDrawingMode = true;
  fc.defaultCursor = 'crosshair';

  const brush = new fabric.PencilBrush(fc);
  brush.color = hexToRgba(strokeColor, 0.35);
  brush.width = strokeWidth * 6;
  brush.strokeLineCap = 'square';
  fc.freeDrawingBrush = brush;

  const onPathCreated = () => onStrokeComplete();
  fc.on('path:created', onPathCreated);

  return () => {
    fc.off('path:created', onPathCreated);
    fc.isDrawingMode = false;
  };
};
