import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'https://clubhub-4bla.onrender.com/api',
    withCredentials: true 
});

export default axiosInstance;