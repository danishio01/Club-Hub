import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getTasksApi } from '../service/taskService';

export const fetchAuthorizedTasks = createAsyncThunk(
    'tasks/fetchAuthorized',
    async (params = {}) => getTasksApi(params)
);

const taskSlice = createSlice({
    name: 'tasks',
    initialState: { items: [], isLoading: false, error: null },
    reducers: {
        upsertTask: (state, action) => {
            const index = state.items.findIndex((task) => task._id === action.payload._id);
            if (index === -1) state.items.unshift(action.payload);
            else state.items[index] = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAuthorizedTasks.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchAuthorizedTasks.fulfilled, (state, action) => {
                state.isLoading = false;
                state.items = action.payload;
            })
            .addCase(fetchAuthorizedTasks.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to load tasks';
            });
    }
});

export const { upsertTask } = taskSlice.actions;
export default taskSlice.reducer;
