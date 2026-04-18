import axiosInstance from '../../../api/axiosInstance';
import { loginStart, loginSuccess, loginFailure } from '../state/authSlice';

export const loginAdmin = (credentials) => async (dispatch) => {
    dispatch(loginStart());
    try {
        const response = await axiosInstance.post('/admin/login', credentials);
        dispatch(loginSuccess(response.data.data));
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.message || 'Authentication failed. Please verify your credentials.';
        dispatch(loginFailure(errorMessage));
        throw error;
    }
};