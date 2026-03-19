import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 429) {
      // Custom error or structure for Rate Limiting
      return Promise.reject({
        ...error,
        message: 'Too many requests, please try again later.',
        isRateLimited: true,
      });
    }
    return Promise.reject(error);
  }
);

export default api;
