import axiosInstance from '../../../api/axiosInstance';
import { fetchStudentEventsStart, fetchStudentEventsSuccess, fetchStudentEventsFailure } from '../state/studentEventsSlice';

export const getStudentEventsList = () => async (dispatch) => {
    dispatch(fetchStudentEventsStart());
    try {
        const response = await axiosInstance.get('/events/student-events');
        dispatch(fetchStudentEventsSuccess(response.data.data));
    } catch (error) {
        console.error(error)
        dispatch(fetchStudentEventsFailure('Failed to load events'));
    }
};

export const getStudentEventByIdApi = async (id) => {
    const response = await axiosInstance.get(`/events/student-events/${id}`);
    return response.data.data;
};

export const registerForEventApi = async (eventId) => {
    const response = await axiosInstance.post(`/events/${eventId}/register`);
    return response.data;
};

export const markAttendanceApi = async (eventId, token) => {
    const response = await axiosInstance.post(`/events/${eventId}/attendance`, { token });
    return response.data;
};

export const getCertificatesApi = async () => {
    const response = await axiosInstance.get('/events/student/certificates');
    return response.data.data;
};

export const createPaymentOrderApi = async (eventId) => {
    const response = await axiosInstance.post('/payments/order', { eventId });
    return response.data.data;
};

export const verifyPaymentApi = async (paymentData) => {
    const response = await axiosInstance.post('/payments/verify', paymentData);
    return response.data;
};