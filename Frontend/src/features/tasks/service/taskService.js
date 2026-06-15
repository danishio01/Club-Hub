import axiosInstance from '../../../api/axiosInstance';

export const getTasksApi = async (params = {}) => {
    const normalizedParams = typeof params === 'string' ? { event: params } : params;
    const response = await axiosInstance.get('/tasks', { params: normalizedParams });
    return response.data.data;
};

const taskMutation = async (request) => {
    const response = await request();
    window.dispatchEvent(new CustomEvent('clubhub:tasks-mutated', { detail: response.data.data }));
    return response.data.data;
};

export const startTaskApi = async (taskId) => {
    return taskMutation(() => axiosInstance.patch(`/tasks/${taskId}/status`, { status: 'in_progress' }));
};

export const submitTaskApi = async (taskId, submission = {}) => {
    return taskMutation(() => axiosInstance.patch(`/tasks/${taskId}/submit`, submission));
};

export const completeTaskApi = async (taskId, submission = {}) => {
    return taskMutation(() => axiosInstance.patch(`/tasks/${taskId}/complete`, submission));
};

export const reviewTaskApi = async (taskId, decision, reason = '') => {
    return taskMutation(() => axiosInstance.patch(`/tasks/${taskId}/review`, { decision, reason }));
};

export const takeOverTaskApi = async (taskId, reason = '') => {
    return taskMutation(() => axiosInstance.patch(`/tasks/${taskId}/take-over`, { reason }));
};
