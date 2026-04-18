import axios, { InternalAxiosRequestConfig } from 'axios';

// Use relative path - VM nginx will proxy /api to backend
const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data: { username: string; email: string; password: string; purpose?: string; role?: string; manager_id?: number }) =>
    api.post('/register', data),

  login: (username: string, password: string) =>
    api.post('/token', new URLSearchParams({ username, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),

  verifyOTP: (email: string, otp: string) =>
    api.post('/verify-otp', { email, otp }),

  resendOTP: (email: string) =>
    api.post('/resend-otp', { email }),

  forgotPassword: (email: string) =>
    api.post('/forgot-password', { email }),

  resetPassword: (email: string, otp: string, new_password: string) =>
    api.post('/reset-password', { email, otp, new_password }),

  changePassword: (old_password: string, new_password: string) =>
    api.post('/change-password', { old_password, new_password }),

  getCurrentUser: () => api.get('/users/me'),
};

export const simulationAPI = {
  create: (data: { name: string; parameters: any }) =>
    api.post('/simulations', data),
  getSimulations: () => api.get('/simulations'),
  getAll: () => api.get('/simulations'),
  getById: (id: number) => api.get(`/simulations/${id}`),
  deleteSimulation: (id: number) => api.delete(`/simulations/${id}`),
  delete: (id: number) => api.delete(`/simulations/${id}`),
};

export const iotAPI = {
  getLatest: () => api.get('/iot/latest'),
  getHistory: (limit = 50) => api.get(`/iot/data?limit=${limit}`),
};
