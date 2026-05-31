import { configureStore } from '@reduxjs/toolkit';
import authReducer from './modules/authSlice';
import uiReducer from './modules/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
