import type { DrawingTool } from '../../store/types';
import type { AnnotationTool } from './types';
import { penTool } from './penTool';
import { highlighterTool } from './highlighterTool';
import { eraserTool } from './eraserTool';
import { rectangleTool } from './rectangleTool';
import { arrowTool } from './arrowTool';
import { textTool } from './textTool';

export const toolRegistry: Record<DrawingTool, AnnotationTool> = {
  pen: penTool,
  highlighter: highlighterTool,
  eraser: eraserTool,
  rectangle: rectangleTool,
  arrow: arrowTool,
  text: textTool,
};
