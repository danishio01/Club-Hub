import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    stats: null,
    isLoading: false,
    error: null,
};

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        fetchStatsStart: (state) => {
            state.isLoading = true;
            state.error = null;
        },
        fetchStatsSuccess: (state, action) => {
            state.isLoading = false;
            state.stats = action.payload;
        },
        fetchStatsFailure: (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        }
    },
});

export const { fetchStatsStart, fetchStatsSuccess, fetchStatsFailure } = dashboardSlice.actions;
export default dashboardSlice.reducer;