import { fabric } from 'fabric';
import type { AnnotationTool } from './types';

const ERASE_RADIUS = 20;

export const eraserTool: AnnotationTool = (fc, { strokeWidth, onStrokeComplete }) => {
  fc.isDrawingMode = false;
  fc.defaultCursor = 'cell';

  let isErasing = false;
  let didErase = false;

  const onMouseDown = () => {
    isErasing = true;
    didErase = false;
  };

  const onMouseUp = () => {
    isErasing = false;
    if (didErase) {
      onStrokeComplete();
      didErase = false;
    }
  };

  const onMouseMove = (opt: fabric.IEvent) => {
    if (!isErasing) return;
    const pointer = fc.getPointer(opt.e as MouseEvent);
    const hitRadius = ERASE_RADIUS + strokeWidth;

    fc.getObjects().forEach((obj) => {
      const center = obj.getCenterPoint();
      const dx = center.x - pointer.x;
      const dy = center.y - pointer.y;
      const halfSize = Math.max(obj.width ?? 0, obj.height ?? 0) / 2;
      if (Math.sqrt(dx * dx + dy * dy) < hitRadius + halfSize) {
        fc.remove(obj);
        didErase = true;
      }
    });

    if (didErase) fc.renderAll();
  };

  fc.on('mouse:down', onMouseDown);
  fc.on('mouse:up', onMouseUp);
  fc.on('mouse:move', onMouseMove);

  return () => {
    fc.off('mouse:down', onMouseDown);
    fc.off('mouse:up', onMouseUp);
    fc.off('mouse:move', onMouseMove);
    fc.defaultCursor = 'default';
  };
};
