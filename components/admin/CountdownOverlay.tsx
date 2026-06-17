"use client";

import { useEffect, useState } from "react";
import { Radio, Lock, Unlock } from "lucide-react";

export type CountdownVariant = "request" | "close" | "reopen";

const COPY: Record<CountdownVariant, {
  intro: string;
  done: string;
  finalColor: string;
  Icon: typeof Radio;
}> = {
  request: { intro: "Going live in", done: "LIVE NOW",   finalColor: "var(--color-brand-gold)", Icon: Radio },
  close:   { intro: "Closing in",   done: "CLOSED",      finalColor: "#FCA5A5",                   Icon: Lock },
  reopen:  { intro: "Reopening in", done: "BACK LIVE",   finalColor: "var(--color-brand-gold)", Icon: Unlock },
};

/**
 * Full-screen broadcast countdown — 1, 2, 3, big finish.
 * Fires after the API call succeeds; on the finish flash it calls onDone.
 */
export function CountdownOverlay({
  variant, label, onDone,
}: {
  variant: CountdownVariant;
  label: string;
  onDone: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const { intro, done, finalColor, Icon } = COPY[variant];

  useEffect(() => {
    if (step === 4) {
      const t = setTimeout(onDone, 800);
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
        @keyframes ltFinishIn {
          0%   { opacity: 0; transform: scale(0.7); }
          60%  { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ltFinishPulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.05); }
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
              {intro}
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
            className="flex flex-col items-center"
            style={{ animation: "ltFinishIn 0.5s ease-out, ltFinishPulse 1.4s ease-in-out 0.5s infinite" }}
          >
            <div
              className="rounded-full flex items-center justify-center mb-5"
              style={{
                width: 96, height: 96,
                background: "rgba(255,255,255,0.12)",
                border: `2px solid ${finalColor}`,
                color: finalColor,
              }}
            >
              <Icon className="w-12 h-12" strokeWidth={2.25} />
            </div>
            <div className="font-black" style={{ fontSize: 44, color: finalColor, letterSpacing: "-0.03em" }}>
              {done}
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
