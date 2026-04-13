import { configureStore } from '@reduxjs/toolkit';
import screenShareReducer from './slices/screenShareSlice';
import annotationReducer from './slices/annotationSlice';

export const store = configureStore({
  reducer: {
    screenShare: screenShareReducer,
    annotation: annotationReducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type { RootState } from './types';
