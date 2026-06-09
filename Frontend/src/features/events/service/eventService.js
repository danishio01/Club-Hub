import axiosInstance from '../../../api/axiosInstance';
import { fetchEventsStart, fetchEventsSuccess, fetchEventsFailure } from '../state/eventSlice';

export const getEventsList = () => async (dispatch, getState) => {
    dispatch(fetchEventsStart());
    try {
        const { auth } = getState();
        const role = auth.user?.role;
        const endpoint = role === 'president' ? '/events/president/all' : '/events';
        
        const response = await axiosInstance.get(endpoint);
        dispatch(fetchEventsSuccess(response.data.data));
    } catch (error) {
        console.error(error);
        dispatch(fetchEventsFailure('Failed to load events'));
    }
};

export const getEventByIdApi = async (id) => {
    const response = await axiosInstance.get(`/events/${id}`);
    return response.data.data;
};

export const createEventService = async (eventData) => {
    return await axiosInstance.post('/events', eventData);
};

export const updateEventService = async (id, eventData) => {
    return await axiosInstance.put(`/events/${id}`, eventData);
};

export const deleteEventService = async (id) => {
    return await axiosInstance.delete(`/events/${id}`);
};

export const markEventCompletedApi = async (id) => {
    const response = await axiosInstance.patch(`/events/${id}/complete`);
    return response.data.data;
};

export const approveEventApi = async (id) => {
    const response = await axiosInstance.patch(`/events/${id}/approve`);
    return response.data.data;
};

export const rejectEventApi = async (id, payload) => {
    const response = await axiosInstance.patch(`/events/${id}/reject`, payload);
    return response.data.data;
};

export const getEventRegistrationsApi = async (eventId) => {
    const response = await axiosInstance.get(`/events/${eventId}/registrations`);
    return response.data.data;
};

export const generateQrTokenApi = async (eventId) => {
    const response = await axiosInstance.get(`/events/${eventId}/qr-token`);
    return response.data.data;
};

export const getEventReviewsApi = async (eventId) => {
    const response = await axiosInstance.get(`/events/${eventId}/reviews`);
    return response.data.data;
};

export const summarizeReviewsApi = async (eventId) => {
    const response = await axiosInstance.post(`/events/${eventId}/reviews/summary`);
    return response.data.data;
};

export const generateEventFromAIApi = async (prompt) => {
    const response = await axiosInstance.post('/ai/generate-event', { prompt });
    return response.data.data;
};

export const getGrafikEventsApi = async () => {
    const response = await axiosInstance.get('/events/grafik/all');
    return response.data.data;
};

export const getGrafikEventByIdApi = async (id) => {
    const response = await axiosInstance.get(`/events/grafik/${id}`);
    return response.data.data;
};

export const generateBannerApi = async (id) => {
    const response = await axiosInstance.post(`/events/${id}/banner/generate`);
    return response.data.data;
};

export const uploadCustomBannerApi = async (id, imageBase64) => {
    const response = await axiosInstance.post(`/events/${id}/banner/upload`, { imageBase64 });
    return response.data.data;
};

export const approveBannerApi = async (id) => {
    const response = await axiosInstance.patch(`/events/${id}/banner/approve`);
    return response.data.data;
};