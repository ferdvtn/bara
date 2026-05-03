"use client";

import { useState, useEffect, useCallback } from "react";

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore token from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    if (storedToken) {
      setAuthState({ isAuthenticated: true, token: storedToken });
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error ?? "PIN salah" };
      }

      const { token } = data as { token: string };
      localStorage.setItem("auth_token", token);
      setAuthState({ isAuthenticated: true, token });
      return { success: true };
    } catch {
      return { success: false, error: "Gagal terhubung ke server" };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    setAuthState({ isAuthenticated: false, token: null });
  }, []);

  /**
   * Returns headers with Authorization for API calls.
   */
  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (!authState.token) return {};
    return { Authorization: `Bearer ${authState.token}` };
  }, [authState.token]);

  return {
    isAuthenticated: authState.isAuthenticated,
    token: authState.token,
    isLoading,
    login,
    logout,
    getAuthHeaders,
  };
}
