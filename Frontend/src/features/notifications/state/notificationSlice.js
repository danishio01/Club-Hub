import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    notifications: [],
    unreadCount: 0,
    pagination: { total: 0, page: 1, limit: 10, pages: 1 },
    isLoading: false,
    error: null
};

const notificationSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        fetchAlertsStart: (state) => {
            state.isLoading = true;
            state.error = null;
        },
        fetchAlertsSuccess: (state, action) => {
            state.isLoading = false;
            state.notifications = action.payload.notifications;
            state.unreadCount = action.payload.unreadCount;
            state.pagination = action.payload.pagination;
        },
        fetchAlertsFailure: (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        },
        updateUnreadCount: (state, action) => {
            state.unreadCount = action.payload;
        },
        locallyMarkRead: (state, action) => {
            const target = state.notifications.find(n => n._id === action.payload);
            if (target && !target.isRead) {
                target.isRead = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        },
        locallyMarkAllRead: (state) => {
            state.notifications.forEach(n => { n.isRead = true; });
            state.unreadCount = 0;
        }
    }
});

export const { 
    fetchAlertsStart, 
    fetchAlertsSuccess, 
    fetchAlertsFailure, 
    updateUnreadCount, 
    locallyMarkRead, 
    locallyMarkAllRead 
} = notificationSlice.actions;

export default notificationSlice.reducer;