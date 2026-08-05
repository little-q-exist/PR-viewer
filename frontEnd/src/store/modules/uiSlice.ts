import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarExpanded: boolean;
  currentReviewId: string | null;
}

const initialState: UIState = {
  sidebarExpanded: false,
  currentReviewId: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarExpanded(state, action: PayloadAction<boolean>) {
      state.sidebarExpanded = action.payload;
    },
    setCurrentReviewId(state, action: PayloadAction<string | null>) {
      state.currentReviewId = action.payload;
    },
    resetUI() {
      return initialState;
    },
  },
});

export const { setSidebarExpanded, setCurrentReviewId, resetUI } = uiSlice.actions;
export default uiSlice.reducer;
