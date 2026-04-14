import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AnnotationState, DrawingTool } from '../store/types';

const initialState: AnnotationState = {
  isEnabled: false,
  activeTool: 'pen',
  strokeColor: '#ef4444',
  strokeWidth: 3,
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
    resetAnnotation(state) {
      state.isEnabled = false;
      state.activeTool = 'pen';
      state.strokeColor = '#ef4444';
      state.strokeWidth = 3;
    },
  },
});

export const {
  toggleAnnotation,
  setAnnotationEnabled,
  setActiveTool,
  setStrokeColor,
  setStrokeWidth,
  resetAnnotation,
} = annotationSlice.actions;

export default annotationSlice.reducer;
