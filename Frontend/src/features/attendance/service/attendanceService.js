import axiosInstance from '../../../api/axiosInstance';

export const getStudentAttendanceReportApi = async () => {
    const response = await axiosInstance.get('/events/student/attendance-report');
    return response.data.data;
};

export const getAdminAttendanceReportApi = async () => {
    const response = await axiosInstance.get('/events/admin/attendance-report');
    return response.data.data;
};