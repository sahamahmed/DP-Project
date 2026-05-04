"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Admin,
  getStoredAdmin,
  getStoredToken,
  login as apiLogin,
  signup as apiSignup,
  logout as apiLogout,
  updateActiveStatus as apiUpdateStatus,
  LoginCredentials,
  SignupCredentials,
  clearAuthData,
} from "@/lib/api/auth-api";

interface AuthContextType {
  admin: Admin | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => void;
  updateActiveStatus: (isActive: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ["/login", "/signup"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check for existing auth on mount
  useEffect(() => {
    const token = getStoredToken();
    const storedAdmin = getStoredAdmin();

    if (token && storedAdmin) {
      setAdmin(storedAdmin);
    }
    setIsLoading(false);
  }, []);

  // Redirect logic
  useEffect(() => {
    if (isLoading) return;

    const isPublicPath = PUBLIC_PATHS.includes(pathname);

    if (!admin && !isPublicPath) {
      router.push("/login");
    } else if (admin && isPublicPath) {
      router.push("/");
    }
  }, [admin, isLoading, pathname, router]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await apiLogin(credentials);
    setAdmin(response.admin);
  }, []);

  const signup = useCallback(async (credentials: SignupCredentials) => {
    const response = await apiSignup(credentials);
    setAdmin(response.admin);
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setAdmin(null);
    clearAuthData();
    router.push("/login");
  }, [router]);

  const updateActiveStatus = useCallback(
    async (isActive: boolean) => {
      const result = await apiUpdateStatus(isActive);
      if (result && admin) {
        setAdmin({ ...admin, isActive });
      }
    },
    [admin]
  );

  const value: AuthContextType = {
    admin,
    isLoading,
    isAuthenticated: !!admin,
    login,
    signup,
    logout,
    updateActiveStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
