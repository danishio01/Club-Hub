import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/state/authSlice';
import dashboardReducer from '../features/dashboard/state/dashboardSlice';
import studentReducer from '../features/students/state/studentSlice';
import clubReducer from '../features/clubs/state/clubSlice';
import eventReducer from '../features/events/state/eventSlice';
import studentEventsReducer from '../features/studentEvents/state/studentEventsSlice';
import reportReducer from '../features/reports/state/reportSlice';
import notificationReducer from '../features/notifications/state/notificationSlice';
import taskReducer from '../features/tasks/state/taskSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        dashboard: dashboardReducer,
        students: studentReducer,
        clubs: clubReducer,
        events: eventReducer,
        studentEvents: studentEventsReducer,
        reports: reportReducer,
        notifications: notificationReducer,
        tasks: taskReducer
    },
});
