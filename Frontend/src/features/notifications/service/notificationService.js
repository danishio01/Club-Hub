import axiosInstance from '../../../api/axiosInstance';

export const fetchMyNotificationsApi = async (page = 1, limit = 10) => {
    const response = await axiosInstance.get(`/notifications?page=${page}&limit=${limit}`);
    return response.data.data;
};

export const registerFcmTokenApi = async (token) => {
    const response = await axiosInstance.post('/notifications/token/register', {
        token,
        device: {
            platform: navigator.userAgentData?.platform || navigator.platform,
            deviceLabel: `${navigator.vendor || 'Browser'} ${navigator.userAgentData?.mobile ? 'mobile' : 'desktop'}`
        }
    });
    return response.data;
};

export const clearFcmTokenApi = async (token) => {
    const response = await axiosInstance.post('/notifications/token/clear', { token });
    return response.data;
};

export const markNotificationReadApi = async (notificationId) => {
    const response = await axiosInstance.patch(`/notifications/${notificationId}/read`);
    return response.data;
};

export const markAllNotificationsReadApi = async () => {
    const response = await axiosInstance.patch('/notifications/read-all');
    return response.data;
};

export const sendTestNotificationApi = async () => {
    const response = await axiosInstance.post('/notifications/test');
    return response.data;
};

export const fetchPushStatusApi = async () => {
    const response = await axiosInstance.get('/notifications/status');
    return response.data.data;
};
