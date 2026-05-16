import axiosInstance from '../../../api/axiosInstance';
import { fetchStatsStart, fetchStatsSuccess, fetchStatsFailure } from '../state/dashboardSlice';

export const getDashboardData = () => async (dispatch, getState) => {
    dispatch(fetchStatsStart());
    try {
        const { auth } = getState();
        const role = auth.user?.role;
        const endpoint = role === 'president' ? '/dashboard/president-stats' : '/dashboard/stats';
        
        const response = await axiosInstance.get(endpoint);
        dispatch(fetchStatsSuccess(response.data.data));
    } catch (error) {
        console.error(error);
        dispatch(fetchStatsFailure('Failed to load dashboard statistics'));
    }
};