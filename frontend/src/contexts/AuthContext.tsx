import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import api from "@/lib/api";
import type { UserRole } from "@/lib/mock-data";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  schoolName?: string;
  schoolCode?: string;
  school?: { _id?: string; schoolName?: string; schoolCode?: string } | string;
  class?: string;
  section?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (identifier: string, password: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function normalizeRole(role: string): UserRole {
  if (role === "schooladmin") return "school_admin";
  return role as UserRole;
}

async function tryEndpoint(endpoint: string, body: object): Promise<{ success: boolean; token?: string; user?: AuthUser; error?: string } | null> {
  try {
    const res = await api.post(endpoint, body);
    if (res.data?.success) {
      return { success: true, token: res.data.token, user: res.data.user };
    }
    return { success: false, error: res.data?.message };
  } catch (err: any) {
    // Network / no-response error → let caller decide (return null)
    if (!err?.response) return null;
    return { success: false, error: err.response?.data?.message };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("eduflow_user");
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  });

  const login = useCallback(async (identifier: string, password: string, role?: string): Promise<{ success: boolean; error?: string }> => {
    if (!identifier.trim() || !password) {
      return { success: false, error: "Credentials are required." };
    }

    const storeUser = (token: string, apiUser: AuthUser) => {
      const normalized: AuthUser = { ...apiUser, role: normalizeRole(apiUser.role) };
      localStorage.setItem("eduflow_token", token);
      localStorage.setItem("eduflow_user", JSON.stringify(normalized));
      setUser(normalized);
    };

    const NETWORK_ERR = "Could not reach the server. Please check your connection and try again.";

    if (role === "school_admin" || role === "schooladmin") {
      const res = await tryEndpoint("/auth/admin/login", { email: identifier, password });
      if (res?.success && res.token && res.user) { storeUser(res.token, res.user); return { success: true }; }
      return { success: false, error: res?.error ?? NETWORK_ERR };
    }
    if (role === "teacher") {
      const res = await tryEndpoint("/auth/teacher/login", { email: identifier, password });
      if (res?.success && res.token && res.user) { storeUser(res.token, res.user); return { success: true }; }
      return { success: false, error: res?.error ?? NETWORK_ERR };
    }
    if (role === "student") {
      const res = await tryEndpoint("/auth/student/login", { studentId: identifier, password });
      if (res?.success && res.token && res.user) { storeUser(res.token, res.user); return { success: true }; }
      return { success: false, error: res?.error ?? NETWORK_ERR };
    }
    if (role === "parent") {
      const res = await tryEndpoint("/auth/parent/login", { email: identifier, password });
      if (res?.success && res.token && res.user) { storeUser(res.token, res.user); return { success: true }; }
      return { success: false, error: res?.error ?? NETWORK_ERR };
    }

    // No role hint — try all endpoints in sequence
    const attempts = [
      { url: "/auth/admin/login", body: { email: identifier, password } },
      { url: "/auth/teacher/login", body: { email: identifier, password } },
      { url: "/auth/parent/login", body: { email: identifier, password } },
      { url: "/auth/student/login", body: { studentId: identifier, password } },
    ];
    for (const attempt of attempts) {
      const res = await tryEndpoint(attempt.url, attempt.body);
      if (res?.success && res.token && res.user) {
        storeUser(res.token, res.user);
        return { success: true };
      }
    }
    return { success: false, error: "Invalid email or password." };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("eduflow_user");
    localStorage.removeItem("eduflow_token");
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export type { UserRole };
