"use client";

import { Home, BarChart3 } from "lucide-react";

interface BottomNavProps {
  activeScreen: "home" | "stats";
  onNavigate: (screen: "home" | "stats") => void;
}

export default function BottomNav({ activeScreen, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#0c0c0c]/95 backdrop-blur-md border-t border-[#1f1f1f] pb-safe">
      <div className="flex">
        <NavButton
          id="nav-home"
          icon={<Home size={20} strokeWidth={activeScreen === "home" ? 2.5 : 1.75} />}
          label="Beranda"
          active={activeScreen === "home"}
          onClick={() => onNavigate("home")}
        />
        <NavButton
          id="nav-stats"
          icon={<BarChart3 size={20} strokeWidth={activeScreen === "stats" ? 2.5 : 1.75} />}
          label="Statistik"
          active={activeScreen === "stats"}
          onClick={() => onNavigate("stats")}
        />
      </div>
    </nav>
  );
}

function NavButton({
  id,
  icon,
  label,
  active,
  onClick,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all duration-150 active:opacity-70 relative"
    >
      <span
        className={`transition-all duration-200 ${
          active ? "text-[#f59e0b]" : "text-[#4b5563]"
        } ${active ? "scale-110" : ""}`}
      >
        {icon}
      </span>
      <span
        className={`text-[10px] font-medium transition-colors duration-200 ${
          active ? "text-[#f59e0b]" : "text-[#4b5563]"
        }`}
      >
        {label}
      </span>
      {active && (
        <div className="absolute bottom-0.5 w-4 h-0.5 rounded-full bg-[#f59e0b]" />
      )}
    </button>
  );
}
