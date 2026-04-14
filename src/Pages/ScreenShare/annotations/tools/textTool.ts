import { fabric } from 'fabric';
import type { AnnotationTool } from './types';

export const textTool: AnnotationTool = (fc, { strokeColor, strokeWidth, onStrokeComplete }) => {
  fc.isDrawingMode = false;
  fc.defaultCursor = 'text';
  fc.selection = false;

  const onMouseDown = (opt: fabric.IEvent) => {
    // Don't create a new text box if clicking inside an existing one
    if (opt.target instanceof fabric.IText) return;

    const pointer = fc.getPointer(opt.e as MouseEvent);
    const fontSize = Math.max(16, strokeWidth * 4);

    const text = new fabric.IText('', {
      left: pointer.x,
      top: pointer.y,
      fontFamily: 'sans-serif',
      fontSize,
      fill: strokeColor,
      selectable: true,
      editable: true,
      cursorColor: strokeColor,
    });

    fc.add(text);
    fc.setActiveObject(text);
    text.enterEditing();
    fc.renderAll();

    text.on('editing:exited', () => {
      if ((text.text ?? '').trim().length > 0) {
        onStrokeComplete();
      } else {
        fc.remove(text);
        fc.renderAll();
      }
    });
  };

  fc.on('mouse:down', onMouseDown);

  return () => {
    fc.off('mouse:down', onMouseDown);
    // Exit any active text editing on tool switch
    const active = fc.getActiveObject();
    if (active instanceof fabric.IText && active.isEditing) {
      active.exitEditing();
    }
    fc.selection = true;
    fc.defaultCursor = 'default';
  };
};
