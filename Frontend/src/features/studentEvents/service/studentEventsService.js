import axiosInstance from '../../../api/axiosInstance';
import { fetchStudentEventsStart, fetchStudentEventsSuccess, fetchStudentEventsFailure } from '../state/studentEventsSlice';

export const getStudentEventsList = () => async (dispatch) => {
    dispatch(fetchStudentEventsStart());
    try {
        const response = await axiosInstance.get('/events/student-events');
        dispatch(fetchStudentEventsSuccess(response.data.data));
    } catch (error) {
        console.error(error);
        dispatch(fetchStudentEventsFailure('Failed to load events'));
    }
};

export const registerForEventApi = async (eventId) => {
    const response = await axiosInstance.post(`/events/${eventId}/register`);
    return response.data;
};