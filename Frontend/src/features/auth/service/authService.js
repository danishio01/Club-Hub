import axiosInstance from '../../../api/axiosInstance';
import { loginStart, loginSuccess, loginFailure, logoutSuccess, setAuthChecked } from '../state/authSlice';

export const loginAdmin = (credentials) => async (dispatch) => {
    dispatch(loginStart());
    try {
        const response = await axiosInstance.post('/admin/login', credentials);
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
        dispatch(loginSuccess({ ...response.data.data, role: 'student' }));
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
        console.error(error);
    }
};

export const checkAuthStatus = () => async (dispatch) => {
    try {
        const response = await axiosInstance.get('/auth/student/me');
        dispatch(loginSuccess({ ...response.data.data, role: 'student' }));
    } catch (error) {
        console.error(error);
        dispatch(setAuthChecked());
    }
};