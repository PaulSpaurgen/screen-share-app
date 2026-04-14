import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';

// Saga trigger actions — watched by annotationRootSaga, carry no reducer logic.
export const strokeCommitted      = createAction('annotation/strokeCommitted');
export const undoRequested        = createAction('annotation/undoRequested');
export const redoRequested        = createAction('annotation/redoRequested');
export const clearCanvasRequested = createAction('annotation/clearCanvasRequested');
import { AnnotationState, DrawingTool } from '../store/types';

const initialState: AnnotationState = {
  isEnabled: false,
  activeTool: 'pen',
  strokeColor: '#ef4444',
  strokeWidth: 3,
  canUndo: false,
  canRedo: false,
};

const annotationSlice = createSlice({
  name: 'annotation',
  initialState,
  reducers: {
    toggleAnnotation(state) {
      state.isEnabled = !state.isEnabled;
    },
    setAnnotationEnabled(state, action: PayloadAction<boolean>) {
      state.isEnabled = action.payload;
    },
    setActiveTool(state, action: PayloadAction<DrawingTool>) {
      state.activeTool = action.payload;
    },
    setStrokeColor(state, action: PayloadAction<string>) {
      state.strokeColor = action.payload;
    },
    setStrokeWidth(state, action: PayloadAction<number>) {
      state.strokeWidth = action.payload;
    },
    setCanUndo(state, action: PayloadAction<boolean>) {
      state.canUndo = action.payload;
    },
    setCanRedo(state, action: PayloadAction<boolean>) {
      state.canRedo = action.payload;
    },
    resetAnnotation(state) {
      state.isEnabled = false;
      state.activeTool = 'pen';
      state.strokeColor = '#ef4444';
      state.strokeWidth = 3;
      state.canUndo = false;
      state.canRedo = false;
    },
  },
});

export const {
  toggleAnnotation,
  setAnnotationEnabled,
  setActiveTool,
  setStrokeColor,
  setStrokeWidth,
  setCanUndo,
  setCanRedo,
  resetAnnotation,
} = annotationSlice.actions;

export default annotationSlice.reducer;
