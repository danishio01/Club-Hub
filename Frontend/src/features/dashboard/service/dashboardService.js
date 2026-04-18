import axiosInstance from '../../../api/axiosInstance';
import { fetchStatsStart, fetchStatsSuccess, fetchStatsFailure } from '../state/dashboardSlice';

export const getDashboardData = () => async (dispatch) => {
    dispatch(fetchStatsStart());
    try {
        const response = await axiosInstance.get('/dashboard/stats');
        dispatch(fetchStatsSuccess(response.data.data));
    } catch (error) {
        console.error(error);
        dispatch(fetchStatsFailure('Failed to load dashboard statistics'));
    }
};