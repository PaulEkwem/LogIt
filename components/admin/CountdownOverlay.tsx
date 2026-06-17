"use client";

import { useEffect, useState } from "react";

/**
 * Full-screen broadcast countdown — 1, 2, 3, LIVE NOW.
 * Fires after the request API succeeds; on the LIVE flash it calls onDone.
 */
export function CountdownOverlay({ label, onDone }: { label: string; onDone: () => void }) {
  // Phases: 1 (1s) → 2 (1s) → 3 (1s) → LIVE flash (700ms) → onDone
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  useEffect(() => {
    if (step === 4) {
      const t = setTimeout(onDone, 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4), 1000);
    return () => clearTimeout(t);
  }, [step, onDone]);

  return (
    <>
      <style>{`
        @keyframes ltCountIn {
          0%   { opacity: 0; transform: scale(0.6); }
          40%  { opacity: 1; transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ltLivePulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.06); }
        }
      `}</style>
      <div
        className="fixed inset-0 z-[500] flex flex-col items-center justify-center"
        style={{
          background: "rgba(15,23,42,0.78)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        aria-live="assertive"
        role="status"
      >
        {step < 4 ? (
          <>
            <div
              className="font-extrabold uppercase mb-6"
              style={{ color: "rgba(255,255,255,0.7)", letterSpacing: "0.3em", fontSize: 13 }}
            >
              Going live in
            </div>
            <div
              key={step}
              className="font-black num"
              style={{
                fontSize: 180,
                lineHeight: 1,
                color: "white",
                letterSpacing: "-0.06em",
                animation: "ltCountIn 0.45s ease-out",
              }}
            >
              {step}
            </div>
            <div
              className="font-extrabold text-[12px] uppercase mt-8"
              style={{ color: "rgba(255,255,255,0.55)", letterSpacing: "0.18em" }}
            >
              {label}
            </div>
          </>
        ) : (
          <div
            style={{ animation: "ltLivePulse 0.7s ease-in-out infinite" }}
            className="flex flex-col items-center"
          >
            <div className="text-[88px] mb-3" aria-hidden>🚀</div>
            <div className="font-black" style={{ fontSize: 48, color: "var(--color-brand-gold)", letterSpacing: "-0.03em" }}>
              LIVE NOW
            </div>
            <div className="font-extrabold text-[13px] mt-2" style={{ color: "rgba(255,255,255,0.85)" }}>
              {label}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
