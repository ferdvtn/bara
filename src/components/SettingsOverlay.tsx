"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  RefreshCw,
  X,
  ShieldAlert,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  Loader2,
} from "lucide-react";

interface SettingsOverlayProps {
  getAuthHeaders: () => Record<string, string>;
  onClose: () => void;
  onResetComplete: () => void;
}

type ResetStep = "idle" | "confirm" | "entering-pin" | "loading" | "done" | "error";
type PushStatus = "unknown" | "checking" | "enabled" | "disabled" | "unsupported" | "toggling";

export default function SettingsOverlay({
  getAuthHeaders,
  onClose,
  onResetComplete,
}: SettingsOverlayProps) {
  // ── Reset state ──────────────────────────────────────────────────
  const [step, setStep] = useState<ResetStep>("idle");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [resetError, setResetError] = useState("");

  // ── Push notification state ───────────────────────────────────────
  const [pushStatus, setPushStatus] = useState<PushStatus>("checking");

  useEffect(() => {
    checkPushStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkPushStatus() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("unsupported");
      return;
    }

    // Jika di development atau SW belum terdaftar, jangan nunggu .ready selamanya
    if (process.env.NODE_ENV === "development" && !navigator.serviceWorker.controller) {
      setPushStatus("disabled");
      return;
    }

    try {
      const perm = Notification.permission;
      if (perm === "denied") {
        setPushStatus("disabled");
        return;
      }
      // Cek apakah sudah ada subscription aktif
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setPushStatus(sub ? "enabled" : "disabled");
    } catch (e) {
      console.error("Check push status error:", e);
      setPushStatus("disabled");
    }
  }

  async function handleEnablePush() {
    setPushStatus("toggling");
    try {
      // 1. Minta permission
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPushStatus("disabled");
        return;
      }

      // 2. Subscribe via PushManager
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ).buffer as ArrayBuffer,
      });

      // 3. Kirim subscription ke server
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      if (res.ok) {
        setPushStatus("enabled");
      } else {
        await sub.unsubscribe();
        setPushStatus("disabled");
      }
    } catch (e) {
      console.error("Push subscribe error:", e);
      setPushStatus("disabled");
    }
  }

  async function handleDisablePush() {
    setPushStatus("toggling");
    try {
      // Unsubscribe dari browser
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

      // Hapus dari server
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      setPushStatus("disabled");
    } catch (e) {
      console.error("Push unsubscribe error:", e);
      setPushStatus("enabled");
    }
  }

  // ── Reset handlers ────────────────────────────────────────────────
  const handleReset = async () => {
    if (!pin) return;
    setStep("loading");
    setResetError("");

    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json() as { success?: boolean; error?: string };

      if (res.ok && data.success) {
        setStep("done");
        setTimeout(() => {
          onResetComplete();
          onClose();
        }, 1500);
      } else {
        setResetError(data.error ?? "Reset gagal");
        setStep("error");
        setPin("");
      }
    } catch {
      setResetError("Gagal terhubung ke server");
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
      <div className="relative bg-[#141414] rounded-t-3xl border-t border-[#2a2a2a] animate-slide-up max-h-[90dvh] overflow-y-auto">
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

          {/* ===== MAIN content (idle / error) ===== */}
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

              {/* ── Push Notification Toggle ── */}
              <div className="space-y-1">
                <p className="text-[10px] text-[#6b7280] uppercase tracking-wider">Notifikasi</p>
                <div className="card px-4 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#f3f4f6]">Pengingat Harian</p>
                      <p className="text-xs text-[#6b7280] mt-0.5 leading-relaxed">
                        {pushStatus === "unsupported"
                          ? "Browser ini tidak mendukung push notification."
                          : pushStatus === "enabled"
                          ? "Aktif — kamu akan diingatkan jam 19:00 WIB jika belum log."
                          : "Kamu akan diingatkan jam 19:00 WIB jika belum log hari itu."}
                      </p>
                    </div>

                    {/* Toggle button */}
                    {pushStatus === "unsupported" ? (
                      <span className="text-[10px] text-[#4b5563] flex-shrink-0">N/A</span>
                    ) : pushStatus === "checking" || pushStatus === "toggling" ? (
                      <Loader2 size={18} className="text-[#6b7280] animate-spin flex-shrink-0 mt-0.5" />
                    ) : pushStatus === "enabled" ? (
                      <button
                        onClick={handleDisablePush}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/30 text-[#f59e0b] text-xs font-semibold transition-all hover:bg-[#f59e0b]/25 active:scale-95"
                      >
                        <Bell size={13} strokeWidth={2} />
                        Aktif
                      </button>
                    ) : (
                      <button
                        onClick={handleEnablePush}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-[#6b7280] text-xs font-semibold transition-all hover:bg-[#222] hover:border-[#3a3a3a] active:scale-95"
                      >
                        <BellOff size={13} strokeWidth={2} />
                        Nonaktif
                      </button>
                    )}
                  </div>

                  {/* iOS hint */}
                  {pushStatus === "disabled" && "serviceWorker" in navigator && (
                    <p className="text-[11px] text-[#4b5563] leading-relaxed">
                      💡 Di iPhone/iPad: Install app dulu via Safari → &quot;Add to Home Screen&quot;, lalu aktifkan notifikasi.
                    </p>
                  )}
                </div>
              </div>

              {/* ── Danger Zone ── */}
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
                      ✕ {resetError}
                    </p>
                  )}

                  <button
                    onClick={() => { setStep("confirm"); setResetError(""); }}
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
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
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

// Helper: convert VAPID public key (base64url) ke Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
