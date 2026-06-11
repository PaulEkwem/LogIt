"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Minus, ArrowRight, Check, Flame } from "lucide-react";

type Existing = {
  acquired: number;
  opened_same_day: number;
} | null;

const TOTAL_STEPS = 2;

export function TallyFlow({ existing }: { existing: Existing }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [acquired, setAcquired] = useState(existing?.acquired ?? 0);
  const [openedSameDay, setOpenedSameDay] = useState(existing?.opened_same_day ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<null | {
    acquired: number;
    opened: number;
    convPct: number;
  }>(null);

  const convPct = acquired > 0 ? Math.round((openedSameDay / acquired) * 100) : 0;

  function close() {
    router.push("/home");
  }

  function setOpenedSafe(v: number) {
    setOpenedSameDay(Math.max(0, Math.min(acquired, v)));
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acquired,
          opened_same_day: openedSameDay,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submission failed.");
        return;
      }
      setCelebration({ acquired, opened: openedSameDay, convPct });
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  if (celebration) {
    return (
      <Celebration
        acquired={celebration.acquired}
        opened={celebration.opened}
        convPct={celebration.convPct}
        onContinue={() => { router.push("/home"); router.refresh(); }}
      />
    );
  }

  return (
    <section
      className="fixed inset-0 z-[200] mx-auto max-w-[430px] flex flex-col"
      style={{ background: "var(--color-bg)", left: 0, right: 0 }}
    >
      <div className="px-5 py-4 flex items-center justify-between">
        <button
          onClick={close}
          aria-label="Close"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.06)", color: "var(--color-ink)" }}
        >
          <X className="w-[18px] h-[18px]" />
        </button>
        <div className="flex gap-1.5">
          {[1, 2].map((n) => (
            <span
              key={n}
              className="w-5 h-1 rounded-full transition-colors"
              style={{ background: n <= step ? "var(--color-brand-red)" : "var(--color-line)" }}
            />
          ))}
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 min-h-0 px-6 pb-8 flex flex-col animate-[fadeIn_0.22s_ease-out] overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="font-extrabold text-[10px] uppercase mb-2" style={{ color: "var(--color-muted)", letterSpacing: "0.14em" }}>
          Step {step} of {TOTAL_STEPS} · {step === 1 ? "Acquisitions" : "Opened today"}
        </div>

        {step === 1 && (
          <>
            <div className="font-black text-[24px] mb-8" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em", lineHeight: 1.25 }}>
              How many accounts or prospects did you acquire today?
            </div>
            <BigStepper value={acquired} onChange={setAcquired} />
            <AcquiredEncouragement n={acquired} />
            <Footer onNext={() => setStep(2)} />
          </>
        )}

        {step === 2 && (
          <>
            <div className="font-black text-[24px] mb-8" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em", lineHeight: 1.25 }}>
              Of those <span className="num">{acquired}</span>, how many opened today?
            </div>
            <BigStepper value={openedSameDay} onChange={setOpenedSafe} max={acquired} />
            <OpenedEncouragement acquired={acquired} opened={openedSameDay} convPct={convPct} />

            {error && (
              <div className="text-center mt-3 text-[13px] font-bold" style={{ color: "#DC2626" }}>
                {error}
              </div>
            )}

            <div className="mt-auto pt-6 flex flex-col gap-2">
              <button
                onClick={submit}
                disabled={submitting}
                className="w-full rounded-2xl py-4 text-[16px] font-black flex items-center justify-center gap-2 text-white disabled:opacity-40"
                style={{ background: "var(--color-brand-red)", padding: "18px", letterSpacing: "-0.01em" }}
              >
                <Check className="w-[18px] h-[18px]" /> {submitting ? "Submitting…" : "Submit report"}
              </button>
              <button
                onClick={() => setStep(1)}
                className="w-full text-[13px] font-extrabold py-2"
                style={{ color: "var(--color-muted)" }}
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function AcquiredEncouragement({ n }: { n: number }) {
  let body: React.ReactNode;
  let green = false;
  if (n === 0)         body = <>👀 Count every prospect — even the ones whose accounts aren&apos;t open yet.</>;
  else if (n < 5)      body = <>👍 <b className="num">{n}</b> {n === 1 ? "prospect" : "prospects"} acquired today.</>;
  else if (n < 10)     body = <>💪 <b className="num">{n}</b> acquired — building momentum.</>;
  else if (n < 20)     { body = <>🔥 <b className="num">{n}</b> acquired today — strong day at the gate.</>; green = true; }
  else                 { body = <>🚀 <b className="num">{n}</b> acquired — exceptional day.</>; green = true; }
  return <Encouragement green={green}>{body}</Encouragement>;
}

function OpenedEncouragement({ acquired, opened, convPct }: { acquired: number; opened: number; convPct: number }) {
  if (acquired === 0)  return <Encouragement>No acquisitions yet — go back and add them first.</Encouragement>;
  if (opened === 0)    return <Encouragement>🌱 Anyone who opens today is a win — keep nudging the rest of your pipeline.</Encouragement>;
  if (convPct >= 70)   return <Encouragement green>🚀 <b className="num">{convPct}%</b> same-day conversion — exceptional close rate.</Encouragement>;
  if (convPct >= 50)   return <Encouragement green>🔥 <b className="num">{convPct}%</b> same-day — top-tier conversion.</Encouragement>;
  if (convPct >= 30)   return <Encouragement>👏 <b className="num">{convPct}%</b> same-day — solid conversion.</Encouragement>;
  return <Encouragement>📈 <b className="num">{convPct}%</b> closed on the spot. The rest will roll into your pipeline.</Encouragement>;
}

function BigStepper({ value, onChange, min = 0, max }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const clamp = (v: number) => Math.max(min, max !== undefined ? Math.min(max, v) : v);
  return (
    <div className="flex items-center justify-center gap-4 my-2 mb-6">
      <StepperBtn onClick={() => onChange(clamp(value - 1))}><Minus className="w-[22px] h-[22px]" strokeWidth={2.5} /></StepperBtn>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value || "0", 10);
          onChange(clamp(isNaN(v) ? 0 : v));
        }}
        className="w-[130px] h-[110px] rounded-[20px] text-center font-black outline-none transition-colors num"
        style={{
          background: "white",
          border: "2px solid var(--color-line)",
          color: "var(--color-ink)",
          fontSize: 64,
          letterSpacing: "-0.04em",
          MozAppearance: "textfield",
        }}
      />
      <StepperBtn onClick={() => onChange(clamp(value + 1))}><Plus className="w-[22px] h-[22px]" strokeWidth={2.5} /></StepperBtn>
    </div>
  );
}

function StepperBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95"
      style={{
        background: "white",
        border: "1.5px solid var(--color-line)",
        color: "var(--color-ink)",
      }}
    >
      {children}
    </button>
  );
}

function Encouragement({ children, green = false }: { children: React.ReactNode; green?: boolean }) {
  return (
    <div
      className="mt-2 rounded-2xl px-4 py-3.5 font-bold text-[14px] min-h-[60px] transition-colors"
      style={{
        background: green ? "#ECFDF5" : "white",
        border: green ? "1.5px solid #BBF7D0" : "1.5px solid var(--color-line)",
        color: green ? "var(--color-funded-d)" : "var(--color-body)",
        lineHeight: 1.5,
        letterSpacing: "-0.005em",
      }}
    >
      {children}
    </div>
  );
}

function Footer({ onNext }: { onNext: () => void }) {
  return (
    <div className="mt-auto pt-6">
      <button
        onClick={onNext}
        className="w-full rounded-2xl py-4 text-[16px] font-black flex items-center justify-center gap-2 text-white"
        style={{ background: "var(--color-brand-red)", padding: "18px", letterSpacing: "-0.01em" }}
      >
        Next <ArrowRight className="w-[18px] h-[18px]" />
      </button>
    </div>
  );
}

function Celebration({
  acquired, opened, convPct, onContinue,
}: {
  acquired: number;
  opened: number;
  convPct: number;
  onContinue: () => void;
}) {
  return (
    <section
      className="fixed z-[300] flex flex-col"
      style={{
        inset: 0,
        marginInline: "auto",
        maxWidth: 430,
        background: "linear-gradient(165deg, #16A34A 0%, #15803D 100%)",
        paddingTop: 60,
        paddingBottom: 32,
        paddingLeft: 28,
        paddingRight: 28,
      }}
    >
      <div
        className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-4"
        style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
      >
        <Check className="w-10 h-10" strokeWidth={3} />
      </div>
      <div className="text-white font-black text-[30px]" style={{ letterSpacing: "-0.03em", lineHeight: 1.1 }}>
        Report submitted
      </div>
      <div className="text-white/70 font-bold text-[13px] mt-1.5">
        {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
      </div>

      <div
        className="rounded-2xl mt-7 p-5"
        style={{
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.18)",
        }}
      >
        <div className="font-extrabold text-[11px] uppercase mb-3" style={{ color: "rgba(255,255,255,0.7)", letterSpacing: "0.12em" }}>
          Today
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SummaryStat label="Opened" value={opened} primary />
          <SummaryStat label="Acquired" value={acquired} />
        </div>
        <div className="mt-3 pt-3 flex justify-between font-bold text-[13px]" style={{ borderTop: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}>
          <span>Same-day conversion</span>
          <span className="num font-black text-white">{convPct}%</span>
        </div>
      </div>

      <div
        className="mt-5 text-center font-bold text-[14px]"
        style={{ color: "rgba(255,255,255,0.85)", letterSpacing: "-0.005em" }}
      >
        <Flame className="inline w-4 h-4 mr-1.5" style={{ color: "var(--color-brand-gold)" }} />
        Streak alive — +1 day
      </div>

      <button
        onClick={onContinue}
        className="mt-auto w-full rounded-2xl py-4.5 text-[16px] font-black flex items-center justify-center gap-2"
        style={{ background: "white", color: "var(--color-funded-d)", padding: 18 }}
      >
        Back to home <ArrowRight className="w-[18px] h-[18px]" />
      </button>
    </section>
  );
}

function SummaryStat({ label, value, primary = false }: { label: string; value: number; primary?: boolean }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ background: primary ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)" }}
    >
      <div className="num text-white" style={{ fontSize: 34, lineHeight: 1, letterSpacing: "-0.04em" }}>
        {value}
      </div>
      <div className="font-extrabold text-[10px] uppercase mt-1" style={{ color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em" }}>
        {label}
      </div>
    </div>
  );
}
