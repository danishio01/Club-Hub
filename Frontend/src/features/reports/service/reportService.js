import axiosInstance from '../../../api/axiosInstance';
import { fetchReportsStart, fetchReportsSuccess, fetchReportsFailure } from '../state/reportSlice';

export const getReportByEventApi = async (eventId) => {
    const response = await axiosInstance.get(`/reports/event/${eventId}`);
    return response.data.data;
};

export const saveReportDraftApi = async (eventId, content) => {
    const response = await axiosInstance.put(`/reports/event/${eventId}/draft`, { content });
    return response.data.data;
};

export const submitReportApi = async (eventId, payload) => {
    const response = await axiosInstance.post(`/reports/event/${eventId}/submit`, payload);
    return response.data.data;
};

export const getAllAdminReportsList = () => async (dispatch) => {
    dispatch(fetchReportsStart());
    try {
        const response = await axiosInstance.get('/reports/admin/all');
        dispatch(fetchReportsSuccess(response.data.data));
    } catch (error) {
        dispatch(fetchReportsFailure('Failed to load reports'));
        console.error(error);
    }
};

export const reviewReportApi = async (reportId, adminRemarks) => {
    const response = await axiosInstance.patch(`/reports/admin/${reportId}/review`, { adminRemarks });
    return response.data.data;
};

export const rejectReportApi = async (reportId, adminRemarks) => {
    const response = await axiosInstance.patch(`/reports/admin/${reportId}/reject`, { adminRemarks });
    return response.data.data;
};
