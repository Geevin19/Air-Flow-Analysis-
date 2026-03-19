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
  
  getCurrentUser: () => api.get('/users/me'),
};

export const simulationAPI = {
  create: (data: { name: string; parameters: any }) =>
    api.post('/simulations', data),
  
  getAll: () => api.get('/simulations'),
  
  getById: (id: number) => api.get(`/simulations/${id}`),
  
  delete: (id: number) => api.delete(`/simulations/${id}`),
};
