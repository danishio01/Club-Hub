import axiosInstance from '../../../api/axiosInstance';
import { fetchClubsStart, fetchClubsSuccess, fetchClubsFailure } from '../state/clubSlice';

export const getClubsList = () => async (dispatch) => {
    dispatch(fetchClubsStart());
    try {
        const response = await axiosInstance.get('/clubs');
        dispatch(fetchClubsSuccess(response.data.data));
    } catch (error) {
        console.error(error);
        dispatch(fetchClubsFailure('Failed to load clubs'));
    }
};

export const createClubService = async (clubData) => {
    return await axiosInstance.post('/clubs', clubData);
};

export const updateClubService = async (id, clubData) => {
    return await axiosInstance.put(`/clubs/${id}`, clubData);
};

export const deleteClubService = async (id) => {
    return await axiosInstance.delete(`/clubs/${id}`);
};

export const addClubMemberService = async (clubId, studentId) => {
    return await axiosInstance.post(`/clubs/${clubId}/members`, { studentId });
};

export const removeClubMemberService = async (clubId, studentId) => {
    return await axiosInstance.delete(`/clubs/${clubId}/members/${studentId}`);
};

export const uploadClubLogoService = async (clubId, imageBase64) => {
    return await axiosInstance.post(`/clubs/${clubId}/logo`, { imageBase64 });
};
