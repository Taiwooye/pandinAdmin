"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// TODO: Set BYPASS_AUTH = false and connect login() to real API when endpoint is ready
const BYPASS_AUTH = true;

const SESSION_KEY = "pandin_admin_session";

type AuthContextType = {
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(BYPASS_AUTH);
  const router = useRouter();

  useEffect(() => {
    if (BYPASS_AUTH) {
      setIsAuthenticated(true);
      return;
    }
    const session = localStorage.getItem(SESSION_KEY);
    if (session === "true") setIsAuthenticated(true);
  }, []);

  function login(email: string, password: string): boolean {
    if (BYPASS_AUTH) {
      setIsAuthenticated(true);
      return true;
    }
    // TODO: replace with real API call
    // const res = await fetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    // if (res.ok) { localStorage.setItem(SESSION_KEY, "true"); setIsAuthenticated(true); return true; }
    return false;
  }

  function logout() {
    if (!BYPASS_AUTH) localStorage.removeItem(SESSION_KEY);
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
