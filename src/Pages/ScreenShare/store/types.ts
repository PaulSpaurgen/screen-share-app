export type ShareStatus = 'idle' | 'requesting' | 'active' | 'error';
export type DrawingTool = 'pen' | 'highlighter' | 'eraser' | 'rectangle' | 'arrow' | 'text';

export interface ScreenShareState {
  status: ShareStatus;
  error: string | null;
}

export interface AnnotationState {
  isEnabled: boolean;
  activeTool: DrawingTool;
  strokeColor: string;
  strokeWidth: number;
  canUndo: boolean;
  canRedo: boolean;
}

export interface RootState {
  screenShare: ScreenShareState;
  annotation: AnnotationState;
}
