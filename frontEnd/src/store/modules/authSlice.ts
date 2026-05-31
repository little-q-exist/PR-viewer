import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
}

function createInitialState(): AuthState {
  const token = localStorage.getItem('token');
  return {
    user: null,
    token,
    isAuthenticated: !!token,
  };
}

const authSlice = createSlice({
  name: 'auth',
  initialState: createInitialState,
  reducers: {
    setAuth(state, action: PayloadAction<{ user: AuthUser; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
    },
    clearAuth(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
});

export const { setAuth, clearAuth, setUser } = authSlice.actions;
export default authSlice.reducer;
