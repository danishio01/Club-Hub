import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    clubs: [],
    isLoading: false,
    error: null,
};

const clubSlice = createSlice({
    name: 'clubs',
    initialState,
    reducers: {
        fetchClubsStart: (state) => {
            state.isLoading = true;
            state.error = null;
        },
        fetchClubsSuccess: (state, action) => {
            state.isLoading = false;
            state.clubs = action.payload;
        },
        fetchClubsFailure: (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        }
    },
});

export const { fetchClubsStart, fetchClubsSuccess, fetchClubsFailure } = clubSlice.actions;
export default clubSlice.reducer;