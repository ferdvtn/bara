"use client";

import { useState, useEffect, useRef } from "react";
import { Delete, Flame } from "lucide-react";

interface LockScreenProps {
  onLogin: (pin: string) => Promise<{ success: boolean; error?: string }>;
}

const MAX_PIN_LENGTH = 12;

export default function LockScreen({ onLogin }: LockScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer
  useEffect(() => {
    if (cooldownUntil > Date.now()) {
      timerRef.current = setInterval(() => {
        const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setCountdown(0);
          setCooldownUntil(0);
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          setCountdown(remaining);
        }
      }, 200);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldownUntil]);

  const isCoolingDown = countdown > 0;

  const handleKey = (key: string) => {
    if (isCoolingDown || isLoading) return;
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
      setError("");
    } else if (pin.length < MAX_PIN_LENGTH) {
      setPin((prev) => prev + key);
      setError("");
    }
  };

  const handleSubmit = async () => {
    if (!pin || isLoading || isCoolingDown) return;
    setIsLoading(true);

    const result = await onLogin(pin);

    if (!result.success) {
      const errMsg = result.error ?? "PIN salah";
      // Detect cooldown message from server (contains "detik")
      if (errMsg.includes("detik") || errMsg.includes("banyak")) {
        const seconds = parseInt(errMsg.match(/\d+/)?.[0] ?? "30");
        setCooldownUntil(Date.now() + seconds * 1000);
        setCountdown(seconds);
      }
      setError(errMsg);
      setPin("");
      triggerShake();
    }
    // If success: isAuthenticated state in parent will flip → LockScreen unmounts
    setIsLoading(false);
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 600);
  };

  const numpadKeys = [
    "1", "2", "3",
    "4", "5", "6",
    "7", "8", "9",
    null, "0", "del",
  ] as const;

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-[#0f0f0f] px-8 select-none">
      {/* Logo */}
      <div className="mb-10 text-center animate-fade-in">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1a0f00] border border-[#f59e0b]/30 mx-auto mb-3">
          <Flame size={28} className="text-[#f59e0b]" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-bold tracking-widest text-[#f59e0b] font-mono uppercase">
          BARA
        </h1>
        <p className="text-xs text-[#6b7280] mt-1 tracking-wider">Masukkan PIN</p>
      </div>

      {/* PIN dots */}
      <div
        className={`flex gap-3 mb-8 ${isShaking ? "animate-shake" : ""}`}
        aria-label="Indikator PIN"
      >
        {Array.from({ length: Math.max(pin.length, 4) }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-150 ${
              i < pin.length
                ? "bg-[#f59e0b] scale-110 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                : "bg-[#2a2a2a]"
            }`}
          />
        ))}
      </div>

      {/* Error / cooldown message */}
      <div className="h-8 mb-4 flex items-center">
        {(error || isCoolingDown) && (
          <p className="text-sm text-[#ef4444] font-medium animate-fade-in text-center">
            {isCoolingDown && countdown > 0
              ? `Coba lagi dalam ${countdown} detik`
              : error}
          </p>
        )}
      </div>

      {/* Numpad 3×4 */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
        {numpadKeys.map((key, idx) => {
          // null slot → Submit button
          if (key === null) {
            return (
              <button
                key={idx}
                onClick={handleSubmit}
                disabled={!pin || isLoading || isCoolingDown}
                className="h-16 rounded-2xl bg-[#f59e0b] text-[#0f0f0f] font-bold text-lg transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 hover:bg-[#fbbf24]"
                aria-label="Masuk"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
                ) : (
                  "↵"
                )}
              </button>
            );
          }

          if (key === "del") {
            return (
              <button
                key={idx}
                onClick={() => handleKey("del")}
                disabled={isCoolingDown || isLoading}
                className="h-16 rounded-2xl bg-[#1a1a1a] text-[#9ca3af] font-medium transition-all duration-100 disabled:opacity-30 active:scale-95 active:bg-[#242424] hover:bg-[#222] flex items-center justify-center"
                aria-label="Hapus"
              >
                <Delete size={20} strokeWidth={1.75} />
              </button>
            );
          }

          return (
            <button
              key={idx}
              onClick={() => handleKey(key)}
              disabled={isCoolingDown || isLoading}
              className="h-16 rounded-2xl bg-[#1a1a1a] text-[#f3f4f6] font-semibold text-xl transition-all duration-100 disabled:opacity-30 active:scale-95 active:bg-[#2a2a2a] hover:bg-[#222] border border-[#2a2a2a]"
              aria-label={`Angka ${key}`}
              id={`numpad-${key}`}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
