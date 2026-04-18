import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    events: [],
    isLoading: false,
    error: null,
};

const studentEventsSlice = createSlice({
    name: 'studentEvents',
    initialState,
    reducers: {
        fetchStudentEventsStart: (state) => {
            state.isLoading = true;
            state.error = null;
        },
        fetchStudentEventsSuccess: (state, action) => {
            state.isLoading = false;
            state.events = action.payload;
        },
        fetchStudentEventsFailure: (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        }
    },
});

export const { fetchStudentEventsStart, fetchStudentEventsSuccess, fetchStudentEventsFailure } = studentEventsSlice.actions;
export default studentEventsSlice.reducer;