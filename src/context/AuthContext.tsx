"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ADMIN_EMAIL = "admin@pandingroup.com";
const ADMIN_PASSWORD = "PaNDiN@2025";
const SESSION_KEY = "pandin_admin_session";

type AuthContextType = {
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (session === "true") setIsAuthenticated(true);
  }, []);

  function login(email: string, password: string): boolean {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem(SESSION_KEY, "true");
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    router.push("/login");
  }

  return <AuthContext.Provider value={{ isAuthenticated, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
