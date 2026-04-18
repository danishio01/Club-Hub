import axiosInstance from '../../../api/axiosInstance';
import { fetchStudentsStart, fetchStudentsSuccess, fetchStudentsFailure } from '../state/studentSlice';

export const getStudentsList = (semester = '', section = '', department = '', search = '') => async (dispatch) => {
    dispatch(fetchStudentsStart());
    try {
        const params = new URLSearchParams();
        if (semester) params.append('semester', semester);
        if (section) params.append('section', section);
        if (department) params.append('department', department);
        if (search) params.append('search', search);
        
        const query = params.toString() ? `?${params.toString()}` : '';
        
        const response = await axiosInstance.get(`/students${query}`);
        dispatch(fetchStudentsSuccess(response.data.data));
    } catch (error) {
        console.error(error);
        dispatch(fetchStudentsFailure('Failed to load students'));
    }
};

export const deleteStudentService = async (id) => {
    return await axiosInstance.delete(`/students/${id}`);
};

export const createStudentService = async (studentData) => {
    return await axiosInstance.post('/students', studentData);
};

export const updateStudentService = async (id, studentData) => {
    return await axiosInstance.put(`/students/${id}`, studentData);
};

export const bulkImportStudentsService = async (studentsArray) => {
    return await axiosInstance.post('/students/bulk', { students: studentsArray });
};

export const bulkUpdateService = async (criteria, updateData) => {
    return await axiosInstance.put('/students/bulk-update', { criteria, updateData });
};