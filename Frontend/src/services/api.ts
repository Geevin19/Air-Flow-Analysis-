import axios, { InternalAxiosRequestConfig } from 'axios';

// In production VITE_API_URL is not set — we use /api which nginx proxies to FastAPI.
// In local dev, vite.config.ts proxy rewrites /api → http://localhost:8000.
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,   // we use Bearer tokens, not cookies
});

// ── Attach JWT to every request ───────────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ── On 401 clear token and redirect to login ──────────────────────────────────
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      // Only redirect if not already on an auth page
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data: {
    username: string;
    email: string;
    password: string;
    purpose?: string;
    role?: string;
    manager_id?: number;
    manager_code?: string;
  }) => api.post('/register', data),

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
  getAll:         () => api.get('/simulations'),
  getById:        (id: number) => api.get(`/simulations/${id}`),
  deleteSimulation: (id: number) => api.delete(`/simulations/${id}`),
  delete:         (id: number) => api.delete(`/simulations/${id}`),
};

export const iotAPI = {
  getLatest:  () => api.get('/iot/latest'),
  getHistory: (limit = 50) => api.get(`/iot/data?limit=${limit}`),
  verify:     (device_id: string) => api.post('/iot/verify', { device_id }),
};
