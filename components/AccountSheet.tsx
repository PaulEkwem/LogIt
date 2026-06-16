"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Flame, LogOut, X } from "lucide-react";

export function AccountSheet({
  open, onClose,
  fullName, amCode, initials, avatarColor, pcName, pcCode, divisionName,
  streak,
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
}) {
  const router = useRouter();

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
        <div
          onClick={onClose}
          className="flex justify-center pt-3 pb-2 cursor-pointer"
          aria-label="Close"
        >
          <div className="w-10 h-1 rounded-full" style={{ background: "#CBD5E1" }} />
        </div>

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

          {/* Streak strip — only stat that survives */}
          <div
            className="mt-5 rounded-2xl px-4 py-3 flex items-center justify-center gap-2.5"
            style={{ background: "white", border: "1.5px solid var(--color-line)" }}
          >
            <Flame className="w-4 h-4" style={{ color: "var(--color-brand-gold-d)" }} strokeWidth={2.5} />
            <span className="font-bold text-[13px]" style={{ color: "var(--color-body)" }}>
              <b className="num" style={{ color: "var(--color-ink)" }}>{streak}</b>
              {" "}
              {streak === 1 ? "day" : "days"} on a streak
            </span>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={signOut}
              className="w-full rounded-2xl py-3.5 font-extrabold text-[14px] flex items-center justify-center gap-2"
              style={{ background: "white", border: "1.5px solid #FECACA", color: "var(--color-brand-red)" }}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
            <div className="text-center text-[11px] font-bold mt-1" style={{ color: "var(--color-muted)" }}>
              Forgot your PIN? Ask your admin to reset it.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
