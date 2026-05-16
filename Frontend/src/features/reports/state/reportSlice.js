import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    reports: [],
    isLoading: false,
    error: null,
};

const reportSlice = createSlice({
    name: 'reports',
    initialState,
    reducers: {
        fetchReportsStart: (state) => { state.isLoading = true; state.error = null; },
        fetchReportsSuccess: (state, action) => { state.isLoading = false; state.reports = action.payload; },
        fetchReportsFailure: (state, action) => { state.isLoading = false; state.error = action.payload; }
    },
});

export const { fetchReportsStart, fetchReportsSuccess, fetchReportsFailure } = reportSlice.actions;
export default reportSlice.reducer;