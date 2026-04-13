import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ScreenShareState, ShareStatus } from '../types';

const initialState: ScreenShareState = {
  status: 'idle',
  error: null,
};

const screenShareSlice = createSlice({
  name: 'screenShare',
  initialState,
  reducers: {
    setStatus(state, action: PayloadAction<ShareStatus>) {
      state.status = action.payload;
      if (action.payload !== 'error') {
        state.error = null;
      }
    },
    setError(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
    },
    reset(state) {
      state.status = 'idle';
      state.error = null;
    },
  },
});

export const { setStatus, setError, reset } = screenShareSlice.actions;
export default screenShareSlice.reducer;
