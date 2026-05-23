"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Flame, Zap, Trophy, KeyRound, LogOut, X } from "lucide-react";

const LEVEL_NAMES = ["Newcomer", "Trainee", "Performer", "Rising Star", "Top Performer", "Division Lead"];

function levelFromXp(xp: number) {
  const level = Math.floor(xp / 500) + 1;
  return {
    n: level,
    name: LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)],
    xpInLevel: xp % 500,
  };
}

export function AccountSheet({
  open, onClose,
  fullName, amCode, initials, avatarColor, pcName, pcCode, divisionName,
  streak, xp,
}: {
  open: boolean;
  onClose: () => void;
  fullName: string;
  amCode: string;
  initials: string;
  avatarColor: string;
  pcName: string;
  pcCode: string;
  divisionName: string;
  streak: number;
  xp: number;
}) {
  const router = useRouter();
  const level = levelFromXp(xp);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    onClose();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 z-[300] transition-opacity duration-200"
        style={{
          background: "rgba(15,23,42,0.5)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-label="Account"
        className="fixed z-[301] w-full max-w-[430px] transition-transform duration-300 ease-out"
        style={{
          bottom: 0,
          left: 0,
          right: 0,
          marginInline: "auto",
          transform: open ? "translateY(0)" : "translateY(100%)",
          background: "var(--color-bg)",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -8px 32px rgba(15,23,42,0.18)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
        }}
      >
        {/* Drag handle */}
        <div
          onClick={onClose}
          className="flex justify-center pt-3 pb-2 cursor-pointer"
          aria-label="Close"
        >
          <div className="w-10 h-1 rounded-full" style={{ background: "#CBD5E1" }} />
        </div>

        {/* Close X (extra affordance, top right) */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-4 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.06)", color: "var(--color-ink)" }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Identity */}
        <div className="px-6 pt-4">
          <div className="flex flex-col items-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-extrabold mb-3"
              style={{ background: avatarColor, fontSize: 22, letterSpacing: "-0.01em" }}
            >
              {initials}
            </div>
            <div className="font-black text-[20px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em" }}>
              {fullName}
            </div>
            <div
              className="font-extrabold text-[11px] uppercase mt-1"
              style={{ color: "var(--color-muted)", letterSpacing: "0.14em" }}
            >
              Code {amCode}
            </div>
            <div className="font-bold text-[12px] mt-0.5" style={{ color: "var(--color-body)" }}>
              {pcName} · PC {pcCode}
            </div>
            <div className="font-bold text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
              {divisionName}
            </div>
          </div>

          {/* Stats card */}
          <div
            className="grid grid-cols-3 gap-1.5 mt-5 rounded-2xl p-1.5"
            style={{ background: "white", border: "1.5px solid var(--color-line)" }}
          >
            <Stat
              icon={<Flame className="w-4 h-4" />}
              value={streak}
              label="Streak"
              tone="gold"
            />
            <Stat
              icon={<Zap className="w-4 h-4" />}
              value={xp}
              label="Total XP"
              tone="gold"
            />
            <Stat
              icon={<Trophy className="w-4 h-4" />}
              value={`L${level.n}`}
              label={level.name}
              tone="ink"
            />
          </div>

          {/* Level progress strip */}
          <div className="mt-3 px-1">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "#EEF2F7" }}>
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${(level.xpInLevel / 500) * 100}%`,
                  background: "linear-gradient(90deg, #FFC800, #F59E0B)",
                }}
              />
            </div>
            <div className="text-center mt-1.5 font-bold text-[10px]" style={{ color: "var(--color-muted)", letterSpacing: "0.04em" }}>
              {500 - level.xpInLevel} XP to Level {level.n + 1}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-2">
            <button
              disabled
              className="w-full rounded-2xl py-3.5 font-extrabold text-[14px] flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
              style={{ background: "white", border: "1.5px solid var(--color-line)", color: "var(--color-body)" }}
            >
              <KeyRound className="w-4 h-4" />
              Change PIN
              <span className="font-bold text-[10px] ml-1" style={{ color: "var(--color-muted)" }}>(soon)</span>
            </button>
            <button
              onClick={signOut}
              className="w-full rounded-2xl py-3.5 font-extrabold text-[14px] flex items-center justify-center gap-2"
              style={{ background: "white", border: "1.5px solid #FECACA", color: "var(--color-brand-red)" }}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({
  icon, value, label, tone,
}: { icon: React.ReactNode; value: string | number; label: string; tone: "gold" | "ink" }) {
  const valueColor = tone === "gold" ? "var(--color-brand-gold-d)" : "var(--color-ink)";
  return (
    <div className="rounded-xl py-2.5 text-center" style={{ background: "var(--color-bg)" }}>
      <div className="flex items-center justify-center" style={{ color: valueColor }}>{icon}</div>
      <div className="num mt-1" style={{ fontSize: 22, color: valueColor, letterSpacing: "-0.03em", lineHeight: 1 }}>
        {value}
      </div>
      <div
        className="font-extrabold text-[9px] uppercase mt-1"
        style={{ color: "var(--color-muted)", letterSpacing: "0.1em" }}
      >
        {label}
      </div>
    </div>
  );
}
