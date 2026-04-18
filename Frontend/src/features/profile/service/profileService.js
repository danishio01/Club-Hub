import axiosInstance from '../../../api/axiosInstance';
import { updateUserInterests } from '../../auth/state/authSlice';

export const updateStudentInterestsAction = (studentId, interests) => async (dispatch) => {
    try {
        const response = await axiosInstance.put(`/students/${studentId}/interests`, { interests });
        dispatch(updateUserInterests(response.data.data.interests));
        return response.data.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
};