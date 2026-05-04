"use client";

import { useState, useEffect, useCallback } from "react";
import LockScreen from "@/components/LockScreen";
import HomeScreen from "@/components/HomeScreen";
import StatsScreen from "@/components/StatsScreen";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useUserState } from "@/hooks/useUserState";

type Screen = "home" | "stats";

export default function App() {
  const {
    isAuthenticated,
    isLoading: authLoading,
    login,
    logout,
    getAuthHeaders,
  } = useAuth();
  const { userState, fetchState } = useUserState(getAuthHeaders);
  const [activeScreen, setActiveScreen] = useState<Screen>("home");

  // Sync URL logic
  useEffect(() => {
    if (typeof window !== "undefined") {
      setActiveScreen(window.location.pathname === "/statistik" ? "stats" : "home");

      const handlePopState = () => {
        setActiveScreen(window.location.pathname === "/statistik" ? "stats" : "home");
      };
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, []);

  const handleNavigate = useCallback((screen: Screen) => {
    setActiveScreen(screen);
    window.history.pushState(null, "", screen === "stats" ? "/statistik" : "/");
  }, []);

  // Fetch user state when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchState();
    }
  }, [isAuthenticated, fetchState]);

  const handleLogin = useCallback(
    async (pin: string): Promise<{ success: boolean; error?: string }> => {
      return login(pin);
    },
    [login],
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#0f0f0f]">
        <div className="w-8 h-8 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LockScreen onLogin={handleLogin} />;
  }

  return (
    <main className="flex flex-col h-dvh bg-[#0f0f0f] overflow-hidden">
      <div className="flex-1 min-h-0 relative">
        <div className={activeScreen === "home" ? "block h-full" : "hidden"}>
          <HomeScreen
            getAuthHeaders={getAuthHeaders}
            onLogout={logout}
            onStateChange={fetchState}
          />
        </div>
        <div className={activeScreen === "stats" ? "block h-full" : "hidden"}>
          <StatsScreen
            getAuthHeaders={getAuthHeaders}
            onLogout={logout}
            currentStreak={userState?.current_streak ?? 0}
            longestStreak={userState?.longest_streak ?? 0}
            isActive={activeScreen === "stats"}
            onStateChange={fetchState}
          />
        </div>
      </div>

      <BottomNav activeScreen={activeScreen} onNavigate={handleNavigate} />
    </main>
  );
}
