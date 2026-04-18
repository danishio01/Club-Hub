import axiosInstance from '../../../api/axiosInstance';
import { fetchEventsStart, fetchEventsSuccess, fetchEventsFailure } from '../state/eventSlice';

export const getEventsList = () => async (dispatch) => {
    dispatch(fetchEventsStart());
    try {
        const response = await axiosInstance.get('/events');
        dispatch(fetchEventsSuccess(response.data.data));
    } catch (error) {
        console.error(error);
        dispatch(fetchEventsFailure('Failed to load events'));
    }
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

export const getEventRegistrationsApi = async (eventId) => {
    const response = await axiosInstance.get(`/events/${eventId}/registrations`);
    return response.data.data;
};