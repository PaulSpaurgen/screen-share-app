import { fabric } from 'fabric';
import type { AnnotationTool } from './types';

function buildArrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
): fabric.Group {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headSize = Math.max(width * 4, 14);

  // Pull the line tip back so it doesn't overlap the arrowhead centre
  const tipX = x2 - (headSize / 2) * Math.cos(angle);
  const tipY = y2 - (headSize / 2) * Math.sin(angle);

  const line = new fabric.Line([x1, y1, tipX, tipY], {
    stroke: color,
    strokeWidth: width,
    selectable: false,
    evented: false,
  });

  // Fabric Triangle points upward at angle 0; atan2 East = 0 → +90°
  const triangle = new fabric.Triangle({
    width: headSize,
    height: headSize,
    fill: color,
    left: x2,
    top: y2,
    angle: (angle * 180) / Math.PI + 90,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  });

  return new fabric.Group([line, triangle], { selectable: false, evented: false });
}

export const arrowTool: AnnotationTool = (fc, { strokeColor, strokeWidth, onStrokeComplete }) => {
  fc.isDrawingMode = false;
  fc.defaultCursor = 'crosshair';
  fc.selection = false;

  let isDown = false;
  let startX = 0;
  let startY = 0;
  let preview: fabric.Group | null = null;

  const onMouseDown = (opt: fabric.IEvent) => {
    isDown = true;
    const p = fc.getPointer(opt.e as MouseEvent);
    startX = p.x;
    startY = p.y;
  };

  const onMouseMove = (opt: fabric.IEvent) => {
    if (!isDown) return;
    const p = fc.getPointer(opt.e as MouseEvent);
    if (preview) fc.remove(preview);
    preview = buildArrow(startX, startY, p.x, p.y, strokeColor, strokeWidth);
    fc.add(preview);
    fc.renderAll();
  };

  const onMouseUp = (opt: fabric.IEvent) => {
    if (!isDown) return;
    isDown = false;
    const p = fc.getPointer(opt.e as MouseEvent);
    const dx = p.x - startX;
    const dy = p.y - startY;

    if (Math.sqrt(dx * dx + dy * dy) > 5) {
      onStrokeComplete();
    } else if (preview) {
      fc.remove(preview);
      fc.renderAll();
    }
    preview = null;
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
