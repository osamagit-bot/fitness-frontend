// utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://fitness-frontend-0ri3.onrender.com/api/',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
