import axios from 'axios';

export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'https://clubhub-4bla.onrender.com';

const axiosInstance = axios.create({
    baseURL: `${API_ORIGIN}/api`,
    withCredentials: true 
});

export default axiosInstance;
