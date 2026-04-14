import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import screenShareReducer from '../screen-share/screenShareSlice';
import annotationReducer from '../annotations/annotationSlice';
import { screenShareRootSaga } from '../screen-share/screenShareSaga';

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    screenShare: screenShareReducer,
    annotation: annotationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // MediaStream / MediaRecorder live in mediaRegistry, not in Redux state,
      // so the serializability check stays happy.
      serializableCheck: true,
    }).concat(sagaMiddleware),
});

sagaMiddleware.run(screenShareRootSaga);

export type AppDispatch = typeof store.dispatch;
export type { RootState } from './types';
