import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export interface RegisterPayload {
  first_name: string
  last_name: string
  email: string
  company?: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  company?: string
  plan: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface FlowDataPoint {
  x: number
  velocity: number
  pressure: number
  turbulence: number
}

export interface PressurePoint {
  position: number
  upper: number
  lower: number
}

export interface SimulationResult {
  id: number
  name: string
  description?: string
  vehicle_type: string
  velocity: number
  air_density: number
  frontal_area: number
  drag_coefficient: number
  lift_coefficient: number
  reynolds_number: number
  angle_of_attack: number
  drag_force: number
  lift_force: number
  dynamic_pressure: number
  power_required: number
  efficiency_score: number
  flow_data: FlowDataPoint[]
  pressure_distribution: PressurePoint[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

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

export const authAPI = {
  register: (data: { username: string; email: string; password: string; purpose?: string }) =>
    api.post('/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/login', data),

  getCurrentUser: () => api.get('/users/me'),
};

export const simulationAPI = {
  list:   ()              => api.get<SimulationResult[]>('/simulations'),
  get:    (id: number)    => api.get<SimulationResult>(`/simulations/${id}`),
  create: (data: SimulationPayload) => api.post<SimulationResult>('/simulations', data),
  delete: (id: number)    => api.delete(`/simulations/${id}`),
  stats:  ()              => api.get('/simulations/stats'),
}

export default api