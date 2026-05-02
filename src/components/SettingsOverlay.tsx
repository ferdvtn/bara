"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCw, X, ShieldAlert, Eye, EyeOff } from "lucide-react";

interface SettingsOverlayProps {
  getAuthHeaders: () => Record<string, string>;
  onClose: () => void;
  onResetComplete: () => void;
}

type ResetStep = "idle" | "confirm" | "entering-pin" | "loading" | "done" | "error";

export default function SettingsOverlay({
  getAuthHeaders,
  onClose,
  onResetComplete,
}: SettingsOverlayProps) {
  const [step, setStep] = useState<ResetStep>("idle");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleReset = async () => {
    if (!pin) return;
    setStep("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json() as { success?: boolean; error?: string };

      if (res.ok && data.success) {
        setStep("done");
        // Give user 1.5s to see success, then close and refresh state
        setTimeout(() => {
          onResetComplete();
          onClose();
        }, 1500);
      } else {
        setErrorMsg(data.error ?? "Reset gagal");
        setStep("error");
        setPin("");
      }
    } catch {
      setErrorMsg("Gagal terhubung ke server");
      setStep("error");
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={step === "loading" ? undefined : onClose}
      />

      {/* Sheet */}
      <div className="relative bg-[#141414] rounded-t-3xl border-t border-[#2a2a2a] animate-slide-up">
        {/* Handle */}
        <div className="w-10 h-1 bg-[#3a3a3a] rounded-full mx-auto mt-4 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
          <h2 className="text-[#f3f4f6] font-semibold text-base">Pengaturan</h2>
          <button
            onClick={onClose}
            disabled={step === "loading"}
            className="text-[#6b7280] hover:text-[#9ca3af] transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 pb-safe space-y-5">

          {/* ===== DONE state ===== */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-8 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
                <RefreshCw size={22} className="text-[#22c55e]" />
              </div>
              <p className="text-[#22c55e] font-semibold text-sm">Data berhasil direset!</p>
              <p className="text-[#6b7280] text-xs text-center">Memuat ulang...</p>
            </div>
          )}

          {/* ===== IDLE / INFO state ===== */}
          {(step === "idle" || step === "error") && (
            <>
              {/* App info */}
              <div className="space-y-1">
                <p className="text-[10px] text-[#6b7280] uppercase tracking-wider">Aplikasi</p>
                <div className="card px-4 py-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9ca3af]">Versi</span>
                    <span className="text-[#f3f4f6] font-mono">MVP 1.0</span>
                  </div>
                </div>
              </div>

              {/* Danger zone */}
              <div className="space-y-2">
                <p className="text-[10px] text-[#ef4444] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert size={11} />
                  Danger Zone
                </p>
                <div className="border border-[#ef4444]/30 bg-[#1a0808] rounded-2xl p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-[#f87171]">Reset Semua Data</p>
                    <p className="text-xs text-[#9ca3af] mt-0.5 leading-relaxed">
                      Hapus seluruh log aktivitas dan kembalikan streak ke nol.
                      Tindakan ini{" "}
                      <span className="text-[#f87171] font-medium">tidak bisa dibatalkan</span>.
                    </p>
                  </div>

                  {step === "error" && (
                    <p className="text-xs text-[#ef4444] bg-[#2a0a0a] rounded-lg px-3 py-2">
                      ✕ {errorMsg}
                    </p>
                  )}

                  <button
                    onClick={() => { setStep("confirm"); setErrorMsg(""); }}
                    className="w-full py-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#f87171] text-sm font-semibold transition-all hover:bg-[#ef4444]/20 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <AlertTriangle size={15} strokeWidth={2} />
                    Reset Data
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ===== CONFIRM step ===== */}
          {step === "confirm" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-start gap-3 bg-[#1a0808] border border-[#ef4444]/30 rounded-2xl p-4">
                <AlertTriangle size={18} className="text-[#f87171] flex-shrink-0 mt-0.5" strokeWidth={2} />
                <div>
                  <p className="text-sm font-semibold text-[#f87171]">Kamu yakin?</p>
                  <p className="text-xs text-[#9ca3af] mt-1 leading-relaxed">
                    Semua log olahraga, streak, dan statistik akan terhapus permanen.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("idle")}
                  className="flex-1 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] text-sm font-medium transition-all hover:bg-[#222] active:scale-[0.98]"
                >
                  Batal
                </button>
                <button
                  onClick={() => setStep("entering-pin")}
                  className="flex-1 py-3 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/40 text-[#f87171] text-sm font-semibold transition-all hover:bg-[#ef4444]/25 active:scale-[0.98]"
                >
                  Lanjut
                </button>
              </div>
            </div>
          )}

          {/* ===== ENTERING PIN step ===== */}
          {step === "entering-pin" && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center">
                <p className="text-sm font-semibold text-[#f3f4f6]">Konfirmasi PIN</p>
                <p className="text-xs text-[#6b7280] mt-1">
                  Masukkan PIN kamu untuk mengkonfirmasi reset
                </p>
              </div>

              {/* PIN input */}
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReset()}
                  placeholder="Masukkan PIN"
                  autoFocus
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-4 py-3.5 pr-11 text-[#f3f4f6] text-sm placeholder-[#4b5563] outline-none focus:border-[#ef4444]/50 transition-colors font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#9ca3af]"
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep("confirm"); setPin(""); }}
                  className="flex-1 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] text-sm font-medium transition-all hover:bg-[#222] active:scale-[0.98]"
                >
                  Kembali
                </button>
                <button
                  onClick={handleReset}
                  disabled={!pin}
                  className="flex-1 py-3 rounded-xl bg-[#ef4444] text-white text-sm font-bold transition-all hover:bg-[#dc2626] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* ===== LOADING state ===== */}
          {step === "loading" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-8 h-8 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#9ca3af] text-sm">Mereset data...</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
