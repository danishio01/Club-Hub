import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    students: [],
    isLoading: false,
    error: null,
};

const studentSlice = createSlice({
    name: 'students',
    initialState,
    reducers: {
        fetchStudentsStart: (state) => {
            state.isLoading = true;
            state.error = null;
        },
        fetchStudentsSuccess: (state, action) => {
            state.isLoading = false;
            state.students = action.payload;
        },
        fetchStudentsFailure: (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        }
    },
});

export const { fetchStudentsStart, fetchStudentsSuccess, fetchStudentsFailure } = studentSlice.actions;
export default studentSlice.reducer;