import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    events: [],
    isLoading: false,
    error: null,
};

const eventSlice = createSlice({
    name: 'events',
    initialState,
    reducers: {
        fetchEventsStart: (state) => {
            state.isLoading = true;
            state.error = null;
        },
        fetchEventsSuccess: (state, action) => {
            state.isLoading = false;
            state.events = action.payload;
        },
        fetchEventsFailure: (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        }
    },
});

export const { fetchEventsStart, fetchEventsSuccess, fetchEventsFailure } = eventSlice.actions;
export default eventSlice.reducer;