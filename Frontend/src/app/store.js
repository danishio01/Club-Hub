import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/state/authSlice';
import dashboardReducer from '../features/dashboard/state/dashboardSlice';
import studentReducer from '../features/students/state/studentSlice';
import clubReducer from '../features/clubs/state/clubSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        dashboard: dashboardReducer,
        students: studentReducer,
        clubs: clubReducer
    },
});