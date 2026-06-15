import axios from 'axios';

export const API_ORIGIN = 'http://localhost:5000';

const axiosInstance = axios.create({
    baseURL: `${API_ORIGIN}/api`,
    withCredentials: true 
});

export default axiosInstance;
