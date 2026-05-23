"use client";

import { useState } from "react";
import { Flame } from "lucide-react";
import { AccountSheet } from "./AccountSheet";

export function Header({
  fullName, amCode, initials, avatarColor,
  pcName, pcCode, divisionName,
  streak,
}: {
  fullName: string;
  amCode: string;
  initials: string;
  avatarColor: string;
  pcName: string;
  pcCode: string;
  divisionName: string;
  streak: number;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-50 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, var(--color-brand-red), var(--color-brand-red-d))",
          padding: "16px 18px",
        }}
      >
        <div className="font-black text-[24px] text-white" style={{ letterSpacing: "-0.035em" }}>
          Log<span style={{ color: "var(--color-brand-gold)" }}>It</span>
        </div>

        <div className="flex items-center gap-2.5">
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

          <button
            onClick={() => setSheetOpen(true)}
            aria-label="Account"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-extrabold transition-transform active:scale-95"
            style={{
              background: avatarColor,
              fontSize: 13,
              letterSpacing: "-0.01em",
              boxShadow: "0 0 0 2px rgba(255,255,255,0.25)",
            }}
          >
            {initials}
          </button>
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
      />
    </>
  );
}
