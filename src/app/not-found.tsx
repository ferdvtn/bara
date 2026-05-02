"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  // Auto-redirect ke home setelah 2 detik
  useEffect(() => {
    const t = setTimeout(() => router.replace("/"), 2000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-[#0f0f0f] text-center px-8">
      <div className="text-5xl mb-4">🔥</div>
      <h1 className="text-lg font-bold text-[#f3f4f6] mb-2">Halaman tidak ditemukan</h1>
      <p className="text-sm text-[#6b7280]">Mengalihkan ke beranda...</p>
    </div>
  );
}
