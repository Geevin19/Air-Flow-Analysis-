import axios, { InternalAxiosRequestConfig } from 'axios';

const API_URL = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data: { username: string; email: string; password: string; purpose?: string }) =>
    api.post('/register', data),

  login: (username: string, password: string) =>
    api.post('/token', new URLSearchParams({ username, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),

  verifyOtp: (email: string, otp: string) =>
    api.post('/verify-otp', { email, otp }),

  resendOtp: (email: string) =>
    api.post('/resend-otp', { email }),

  forgotPassword: (email: string) =>
    api.post('/forgot-password', { email }),

  resetPassword: (email: string, otp: string, new_password: string) =>
    api.post('/reset-password', { email, otp, new_password }),

  changePassword: (current_password: string, new_password: string) =>
    api.post('/change-password', { current_password, new_password }),

  getCurrentUser: () => api.get('/users/me'),
};

export const simulationAPI = {
  create: (data: { name: string; parameters: any }) =>
    api.post('/simulations', data),
  
  getAll: () => api.get('/simulations'),
  
  getById: (id: number) => api.get(`/simulations/${id}`),
  
  delete: (id: number) => api.delete(`/simulations/${id}`),
};
