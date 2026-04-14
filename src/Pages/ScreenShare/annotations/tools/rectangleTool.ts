import { fabric } from 'fabric';
import type { AnnotationTool } from './types';

export const rectangleTool: AnnotationTool = (fc, { strokeColor, strokeWidth, onStrokeComplete }) => {
  fc.isDrawingMode = false;
  fc.defaultCursor = 'crosshair';
  fc.selection = false;

  let isDown = false;
  let originX = 0;
  let originY = 0;
  let rect: fabric.Rect | null = null;

  const onMouseDown = (opt: fabric.IEvent) => {
    isDown = true;
    const pointer = fc.getPointer(opt.e as MouseEvent);
    originX = pointer.x;
    originY = pointer.y;

    rect = new fabric.Rect({
      left: originX,
      top: originY,
      width: 0,
      height: 0,
      stroke: strokeColor,
      strokeWidth,
      fill: 'transparent',
      selectable: false,
      evented: false,
    });
    fc.add(rect);
  };

  const onMouseMove = (opt: fabric.IEvent) => {
    if (!isDown || !rect) return;
    const pointer = fc.getPointer(opt.e as MouseEvent);

    rect.set({
      left: Math.min(pointer.x, originX),
      top: Math.min(pointer.y, originY),
      width: Math.abs(pointer.x - originX),
      height: Math.abs(pointer.y - originY),
    });
    fc.renderAll();
  };

  const onMouseUp = () => {
    if (!isDown) return;
    isDown = false;
    if (rect && (rect.width ?? 0) > 2 && (rect.height ?? 0) > 2) {
      onStrokeComplete();
    } else if (rect) {
      fc.remove(rect);
    }
    rect = null;
  };

  fc.on('mouse:down', onMouseDown);
  fc.on('mouse:move', onMouseMove);
  fc.on('mouse:up', onMouseUp);

  return () => {
    fc.off('mouse:down', onMouseDown);
    fc.off('mouse:move', onMouseMove);
    fc.off('mouse:up', onMouseUp);
    fc.selection = true;
    fc.defaultCursor = 'default';
  };
};
