import axiosInstance from '../../../api/axiosInstance';
import { loginStart, loginSuccess, loginFailure, logoutSuccess, setAuthChecked } from '../state/authSlice';

export const loginAdmin = (credentials) => async (dispatch) => {
    dispatch(loginStart());
    try {
        const response = await axiosInstance.post('/admin/login', credentials);
        // Explicitly stamp admin role for frontend routing convenience
        dispatch(loginSuccess({ ...response.data.data, role: 'admin' }));
        return response.data.data;
    } catch (error) {
        dispatch(loginFailure(error.response?.data?.message || 'Admin login failed'));
        throw error;
    }
};

export const loginStudent = (credentials) => async (dispatch) => {
    dispatch(loginStart());
    try {
        const response = await axiosInstance.post('/auth/student/login', credentials);
        // Trust the role returned by the backend (student, president, or pr)
        dispatch(loginSuccess(response.data.data));
        return response.data.data;
    } catch (error) {
        dispatch(loginFailure(error.response?.data?.message || 'Invalid credentials. Please try again.'));
        throw error;
    }
};

export const logoutStudent = () => async (dispatch) => {
    try {
        await axiosInstance.post('/auth/student/logout');
        dispatch(logoutSuccess());
    } catch (error) {
        console.error("Logout Event Error:", error);
    }
};

export const checkAuthStatus = () => async (dispatch) => {
    try {
        const response = await axiosInstance.get('/auth/student/me');
        // Trust the role returned by the backend on refresh
        dispatch(loginSuccess(response.data.data));
    } catch (error) {
        console.error("Auth Status Check Failed:", error.response?.data?.message || error.message);
        dispatch(setAuthChecked());
    }
};