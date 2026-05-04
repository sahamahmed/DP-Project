const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface Admin {
  id: string;
  name: string;
  email: string;
  restaurantId: string;
  role: string;
  isActive: boolean;
}

export interface AuthResponse {
  admin: Admin;
  accessToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
  restaurantId: string;
}

// Storage keys
const TOKEN_KEY = "auth_token";
const ADMIN_KEY = "auth_admin";

// Get stored token
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

// Get stored admin
export function getStoredAdmin(): Admin | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(ADMIN_KEY);
  return stored ? JSON.parse(stored) : null;
}

// Store auth data
export function storeAuthData(response: AuthResponse): void {
  localStorage.setItem(TOKEN_KEY, response.accessToken);
  localStorage.setItem(ADMIN_KEY, JSON.stringify(response.admin));
}

// Clear auth data
export function clearAuthData(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

// Login
export async function login(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Login failed" }));
    throw new Error(error.message || "Login failed");
  }

  const data: AuthResponse = await response.json();
  storeAuthData(data);
  return data;
}

// Signup
export async function signup(
  credentials: SignupCredentials
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Signup failed" }));
    throw new Error(error.message || "Signup failed");
  }

  const data: AuthResponse = await response.json();
  storeAuthData(data);
  return data;
}

// Get current user profile
export async function getProfile(): Promise<Admin | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      clearAuthData();
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

// Update active status
export async function updateActiveStatus(
  isActive: boolean
): Promise<Admin | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isActive }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Update stored admin
    const storedAdmin = getStoredAdmin();
    if (storedAdmin) {
      storedAdmin.isActive = data.isActive;
      localStorage.setItem(ADMIN_KEY, JSON.stringify(storedAdmin));
    }

    return data;
  } catch {
    return null;
  }
}

// Logout
export function logout(): void {
  // Set inactive before logging out
  updateActiveStatus(false).finally(() => {
    clearAuthData();
  });
}

// Create auth header for API calls
export function getAuthHeader(): { Authorization: string } | {} {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
