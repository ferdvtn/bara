"use client";

import { useState, useCallback } from "react";

export interface UserStateData {
  current_streak: number;
  longest_streak: number;
  freeze_credits: number;
  last_active_date: string | null;
  sesi_hari_ini?: number;
}

export function useUserState(getAuthHeaders: () => Record<string, string>) {
  const [userState, setUserState] = useState<UserStateData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/state", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Gagal memuat state");
      const data = (await res.json()) as UserStateData;
      setUserState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error tidak diketahui");
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  /**
   * Optimistically update userState after a log action,
   * then merge with server response values.
   */
  const updateAfterLog = useCallback(
    (updates: Partial<UserStateData>) => {
      setUserState((prev) => (prev ? { ...prev, ...updates } : null));
    },
    []
  );

  return { userState, isLoading, error, fetchState, updateAfterLog };
}
