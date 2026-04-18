import axiosInstance from '../../../api/axiosInstance';

export const getLeaderboardApi = async () => {
    const response = await axiosInstance.get('/events/leaderboard/rankings');
    return response.data.data;
};

export const resetLeaderboardApi = async () => {
    const response = await axiosInstance.post('/events/leaderboard/reset');
    return response.data;
};