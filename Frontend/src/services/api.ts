// ─────────────────────────────────────────────────
//  AirFlow SIM — API Service
//  Connects Frontend to FastAPI Backend
//  Base URL: http://localhost:8000
// ─────────────────────────────────────────────────

const BASE_URL = "http://localhost:8000";

// ══════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  purpose: string; // pipe type: Circular / Square / Elliptic
}

export interface LoginData {
  username: string;
  password: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  purpose: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface SimulationParameters {
  pipe_type: string;
  pressure: number;
  velocity: number;
  reynolds: number;
}

export interface SimulationCreate {
  name: string;
  parameters: SimulationParameters;
}

export interface SimulationResponse {
  id: number;
  name: string;
  parameters: SimulationParameters;
  results: object;
  user_id: number;
}

// ══════════════════════════════════════════════════
//  TOKEN HELPERS
// ══════════════════════════════════════════════════

// Save token after login
export const saveToken = (token: string): void => {
  localStorage.setItem("token", token);
};

// Get saved token
export const getToken = (): string | null => {
  return localStorage.getItem("token");
};

// Remove token on logout
export const removeToken = (): void => {
  localStorage.removeItem("token");
};

// Check if user is logged in
export const isLoggedIn = (): boolean => {
  return getToken() !== null;
};

// ══════════════════════════════════════════════════
//  AUTH HEADERS HELPER
// ══════════════════════════════════════════════════

const authHeaders = (): HeadersInit => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

// ══════════════════════════════════════════════════
//  AUTH API CALLS
// ══════════════════════════════════════════════════

// ── Register new user ──────────────────────────
export const registerUser = async (
  data: RegisterData
): Promise<UserResponse> => {
  const response = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Registration failed");
  }

  return response.json();
};

// ── Login user — returns JWT token ────────────
export const loginUser = async (
  data: LoginData
): Promise<TokenResponse> => {
  // FastAPI /token needs form data NOT json
  const formData = new URLSearchParams();
  formData.append("username", data.username);
  formData.append("password", data.password);

  const response = await fetch(`${BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Invalid username or password");
  }

  const tokenData: TokenResponse = await response.json();

  // Automatically save token
  saveToken(tokenData.access_token);

  return tokenData;
};

// ── Get current logged in user ─────────────────
export const getCurrentUser = async (): Promise<UserResponse> => {
  const response = await fetch(`${BASE_URL}/users/me`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Not authenticated. Please login again.");
  }

  return response.json();
};

// ── Logout user ────────────────────────────────
export const logoutUser = (): void => {
  removeToken();
};

// ══════════════════════════════════════════════════
//  SIMULATION API CALLS
// ══════════════════════════════════════════════════

// ── Save a simulation to database ─────────────
export const saveSimulation = async (
  data: SimulationCreate
): Promise<SimulationResponse> => {
  const response = await fetch(`${BASE_URL}/simulations`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to save simulation");
  }

  return response.json();
};

// ── Get all simulations for current user ───────
export const getSimulations = async (): Promise<SimulationResponse[]> => {
  const response = await fetch(`${BASE_URL}/simulations`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch simulations");
  }

  return response.json();
};

// ── Get one simulation by ID ───────────────────
export const getSimulationById = async (
  id: number
): Promise<SimulationResponse> => {
  const response = await fetch(`${BASE_URL}/simulations/${id}`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Simulation not found");
  }

  return response.json();
};