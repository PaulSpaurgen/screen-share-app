import { fabric } from 'fabric';

export interface ToolOptions {
  strokeColor: string;
  strokeWidth: number;
  /** Called when a stroke or shape is fully committed to the canvas. */
  onStrokeComplete: () => void;
}

/**
 * Each tool is a function that activates itself on the canvas and returns
 * a cleanup function to fully deactivate it.  React's useEffect cleanup
 * calls this automatically on tool change.
 */
export type AnnotationTool = (fc: fabric.Canvas, opts: ToolOptions) => () => void;
