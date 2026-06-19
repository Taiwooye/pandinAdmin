"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as authApi from "@/services/endpoints/auth";
import { TOKEN_KEY } from "@/services/apiClient";

type AuthContextType = {
  isAuthenticated: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem(TOKEN_KEY));
    setInitialized(true);
  }, []);

  async function login(email: string, password: string) {
    try {
      const res = await authApi.login({ email, password });
      const token = res?.data?.token;
      if (!token) return false;
      localStorage.setItem(TOKEN_KEY, token);
      setIsAuthenticated(true);
      return true;
    } catch {
      return false;
    }
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // best-effort — clear local session regardless of network result
    }
    localStorage.removeItem(TOKEN_KEY);
    setIsAuthenticated(false);
    router.push("/login");
  }

  return <AuthContext.Provider value={{ isAuthenticated, initialized, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
