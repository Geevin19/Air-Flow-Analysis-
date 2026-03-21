export interface SimulationResult {
  id: number;
  name: string;
  vehicle_type: string;
  status: 'completed' | 'running' | 'pending' | 'failed';
  description?: string;
  drag_force?: number;
  lift_force?: number;
  velocity: number;
  efficiency_score?: number;
  created_at?: string;
}
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

// ✅ AUTH API (CLEAN)
export const authAPI = {
  register: (data: { 
  first_name: string; 
  last_name: string; 
  email: string; 
  password: string; 
  company?: string 
}) => {
    return api.post('/register', data);
  },

  login: (data: { email: string; password: string }) => {
    return api.post('/login', data);
  },

  getCurrentUser: () => {
    return api.get('/users/me');
  },
};

// ✅ SIMULATION API
export const simulationAPI = {
  create: (data: { name: string; parameters: any }) => {
    return api.post('/simulations', data);
  },

  getAll: () => {
    return api.get('/simulations');
  },

  getById: (id: number) => {
    return api.get(`/simulations/${id}`);
  },

  delete: (id: number) => {
    return api.delete(`/simulations/${id}`);
  },
};
// Example types (adjust if your backend differs)

export interface FlowDataPoint {
  x: number;
  velocity: number;
  turbulence: number;
  pressure: number;
}

export interface PressurePoint {
  position: number;
  upper: number;
  lower: number;
}
// =======================
// TYPES
// =======================

export interface SimulationPayload {
  name: string
  description?: string
  vehicle_type: string

  velocity: number
  air_density: number
  frontal_area: number

  drag_coefficient: number
  lift_coefficient: number
  angle_of_attack: number
}

export interface FlowDataPoint {
  x: number
  velocity: number
  turbulence: number
  pressure: number
}

export interface PressurePoint {
  position: number
  upper: number
  lower: number
}

export interface SimulationResult {
  id: number
  name: string
  status: "completed" | "running" | "pending" | "failed";

  vehicle_type: string
  velocity: number
  air_density: number
  frontal_area: number
  drag_coefficient: number
  lift_coefficient: number
  angle_of_attack: number

  drag_force?: number
  lift_force?: number
  dynamic_pressure?: number
  power_required?: number
  reynolds_number?: number
  efficiency_score?: number

  flow_data?: FlowDataPoint[]
  pressure_distribution?: PressurePoint[]
  created_at?: string
}