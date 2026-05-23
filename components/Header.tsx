"use client";

import { useState } from "react";
import { Flame, Zap } from "lucide-react";
import { AccountSheet } from "./AccountSheet";

export function Header({
  firstName, fullName, amCode, initials, avatarColor,
  pcName, pcCode, divisionName,
  streak, xp,
}: {
  firstName: string;
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
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-50 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, var(--color-brand-red), var(--color-brand-red-d))",
          padding: "14px 20px 18px",
        }}
      >
        <div className="min-w-0 flex-1 pr-3">
          <div className="font-black text-[22px] text-white" style={{ letterSpacing: "-0.035em" }}>
            Log<span style={{ color: "var(--color-brand-gold)" }}>It</span>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            aria-label="Account"
            className="font-bold text-[11px] uppercase mt-[3px] -ml-1 px-1 py-0.5 rounded transition-colors text-left max-w-full truncate"
            style={{
              color: "rgba(255,255,255,0.72)",
              letterSpacing: "0.04em",
              background: "transparent",
            }}
          >
            {firstName} · {pcName} · PC {pcCode}
          </button>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <div
            className="inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 font-black text-[13px]"
            style={{
              background: "rgba(255,200,0,0.18)",
              color: "var(--color-brand-gold)",
              backdropFilter: "blur(8px)",
              letterSpacing: "-0.01em",
            }}
          >
            <Flame className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="num">{streak}</span>
          </div>
          <div
            className="inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 font-black text-[13px] text-white"
            style={{
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
              letterSpacing: "-0.01em",
            }}
          >
            <Zap className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="num">{xp}</span>
          </div>
        </div>
      </header>

      <AccountSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        fullName={fullName}
        amCode={amCode}
        initials={initials}
        avatarColor={avatarColor}
        pcName={pcName}
        pcCode={pcCode}
        divisionName={divisionName}
        streak={streak}
        xp={xp}
      />
    </>
  );
}
