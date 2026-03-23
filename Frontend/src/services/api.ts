import axios, { InternalAxiosRequestConfig } from 'axios';

const API_URL = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
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
  register: (data: { username: string; email: string; password: string; purpose?: string }) =>
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

export interface FlowDataPoint {
  x: number;
  velocity: number;
  pressure: number;
  turbulence: number;
}

export interface PressurePoint {
  position: number;
  upper: number;
  lower: number;
}

export interface SimulationResult {
  id: number;
  name: string;
  description?: string;
  vehicle_type: string;
  velocity: number;
  air_density: number;
  frontal_area: number;
  drag_coefficient: number;
  lift_coefficient: number;
  reynolds_number?: number;
  angle_of_attack: number;
  drag_force?: number;
  lift_force?: number;
  dynamic_pressure?: number;
  power_required?: number;
  efficiency_score?: number;
  flow_data?: FlowDataPoint[];
  pressure_distribution?: PressurePoint[];
  status?: 'pending' | 'running' | 'completed' | 'failed';
  created_at?: string;
  updated_at?: string;
}

export interface SimulationPayload {
  name: string;
  description?: string;
  vehicle_type: string;
  velocity: number;
  air_density: number;
  frontal_area: number;
  drag_coefficient: number;
  lift_coefficient: number;
  angle_of_attack: number;
}

export interface SimulationCreatePayload {
  name: string;
  parameters: {
    vehicle_type: string;
    description?: string;
    velocity: number;
    air_density: number;
    frontal_area: number;
    drag_coefficient: number;
    lift_coefficient: number;
    angle_of_attack: number;
  };
}

export const simulationAPI = {
  create: (data: SimulationCreatePayload) =>
    api.post('/simulations', data),
  getAll: () => api.get('/simulations'),
  getById: (id: number) => api.get(`/simulations/${id}`),
  delete: (id: number) => api.delete(`/simulations/${id}`),
};

export const iotAPI = {
  getLatest: () => api.get('/iot/latest'),
  getHistory: (limit = 50) => api.get(`/iot/data?limit=${limit}`),
};
