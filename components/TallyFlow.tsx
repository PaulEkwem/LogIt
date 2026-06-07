"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Minus, ArrowRight, Check, Award, CheckCircle2, Circle, Flame } from "lucide-react";
import { ACCOUNT_TYPES, type PosProspect, type TypeKey } from "@/lib/types";
import { PosProspectStep, cleanProspects, validateProspects } from "./PosProspectStep";

type Existing = {
  acquired: number;
  opened_same_day: number;
  total_opened: number;
  type_t1: number;
  type_t3: number;
  type_gt: number;
  type_sm: number;
  type_sk: number;
  pos_prospects?: PosProspect[];
} | null;

const TOTAL_STEPS = 5;

export function TallyFlow({ goal, existing }: { goal: number; existing: Existing }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [acquired, setAcquired] = useState(existing?.acquired ?? 0);
  const [openedSameDay, setOpenedSameDay] = useState(existing?.opened_same_day ?? 0);
  const [totalOpened, setTotalOpened] = useState(existing?.total_opened ?? 0);
  const [byType, setByType] = useState<Record<TypeKey, number>>({
    t1: existing?.type_t1 ?? 0,
    gt: existing?.type_gt ?? 0,
    t3: existing?.type_t3 ?? 0,
    sm: existing?.type_sm ?? 0,
    sk: existing?.type_sk ?? 0,
  });
  const [posProspects, setPosProspects] = useState<PosProspect[]>(existing?.pos_prospects ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<null | {
    acquired: number;
    totalOpened: number;
    convPct: number;
    hitGoal: boolean;
  }>(null);

  const breakdownSum = Object.values(byType).reduce((s, v) => s + v, 0);
  const convPct = acquired > 0 ? Math.round((openedSameDay / acquired) * 100) : 0;
  const fromEarlier = Math.max(0, totalOpened - openedSameDay);

  function close() {
    router.push("/home");
  }

  function setOpenedSafe(v: number) {
    setOpenedSameDay(Math.max(0, Math.min(acquired, v)));
  }

  async function submit() {
    setError(null);
    if (breakdownSum !== totalOpened) {
      setError("Per-type breakdown must sum to total opened.");
      return;
    }
    const cleanedPos = cleanProspects(posProspects);
    const posErr = validateProspects(cleanedPos);
    if (posErr) { setError(posErr); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reports/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acquired,
          opened_same_day: openedSameDay,
          total_opened: totalOpened,
          types: byType,
          pos_prospects: cleanedPos,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submission failed.");
        return;
      }
      setCelebration({
        acquired,
        totalOpened,
        convPct,
        hitGoal: !!data.hitGoal,
      });
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
        totalOpened={celebration.totalOpened}
        convPct={celebration.convPct}
        hitGoal={celebration.hitGoal}
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
          {[1, 2, 3, 4, 5].map((n) => (
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
          Step {step} of {TOTAL_STEPS} · {step === 1 ? "Acquisitions" : step === 2 ? "Same-day conversion" : step === 3 ? "Total openings" : step === 4 ? "Breakdown" : "POS prospects"}
        </div>

        {step === 1 && (
          <>
            <div className="font-black text-[24px] mb-8" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em", lineHeight: 1.25 }}>
              How many accounts or prospects did you acquire today?
            </div>
            <BigStepper value={acquired} onChange={setAcquired} />
            <Encouragement>
              {acquired === 0 && "Count every prospect — even the ones whose accounts aren't open yet."}
              {acquired > 0 && acquired < 10 && (<><b className="num">{acquired}</b> {acquired === 1 ? "prospect" : "prospects"} acquired today.</>)}
              {acquired >= 10 && <span style={{ color: "var(--color-funded-d)" }}><b className="num">{acquired}</b> acquisitions today — strong day at the gate.</span>}
            </Encouragement>
            <Footer onNext={() => setStep(2)} />
          </>
        )}

        {step === 2 && (
          <>
            <div className="font-black text-[24px] mb-8" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em", lineHeight: 1.25 }}>
              Of those <span className="num">{acquired}</span>, how many opened today?
            </div>
            <BigStepper value={openedSameDay} onChange={setOpenedSafe} />
            <Encouragement green={convPct >= 50 && openedSameDay > 0}>
              {acquired === 0 && "No acquisitions yet — go back and add them first."}
              {acquired > 0 && openedSameDay === 0 && "Same-day conversion is the fastest signal of how well your pitch landed."}
              {openedSameDay > 0 && convPct >= 50 && (<>That&apos;s a <b className="num">{convPct}%</b> same-day conversion. Top-tier — bonus XP coming.</>)}
              {openedSameDay > 0 && convPct < 50 && (<><b className="num">{convPct}%</b> converted on the spot. The rest will roll into your pipeline.</>)}
            </Encouragement>
            <Footer onNext={() => setStep(3)} />
          </>
        )}

        {step === 3 && (
          <>
            <div className="font-black text-[24px] mb-8" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em", lineHeight: 1.25 }}>
              Total accounts opened today, including from earlier pipeline?
            </div>
            <BigStepper value={totalOpened} onChange={setTotalOpened} min={openedSameDay} />
            <Encouragement green={fromEarlier > 0}>
              {totalOpened === 0 && "Include every account opened today, no matter when the customer first walked in."}
              {totalOpened > 0 && fromEarlier > 0 && (<><b className="num">{fromEarlier}</b> came from your earlier pipeline. That&apos;s the long game paying off.</>)}
              {totalOpened > 0 && fromEarlier === 0 && (<><b className="num">{totalOpened}</b> opened — all from today&apos;s acquisitions.</>)}
            </Encouragement>
            <Footer onNext={() => setStep(4)} />
          </>
        )}

        {step === 4 && (
          <>
            <div className="font-black text-[24px] mb-8" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em", lineHeight: 1.25 }}>
              How were today&apos;s <span className="num">{totalOpened}</span> openings split across types?
            </div>
            <div className="flex flex-col gap-2 mb-4">
              {ACCOUNT_TYPES.map((t) => (
                <TypeStepRow
                  key={t.key}
                  type={t}
                  value={byType[t.key]}
                  onChange={(v) => setByType((b) => ({ ...b, [t.key]: Math.max(0, v) }))}
                />
              ))}
            </div>
            <div
              className="rounded-2xl px-4 py-3.5 flex justify-between items-center font-black transition-all"
              style={{
                background: breakdownSum === totalOpened && totalOpened > 0 ? "#ECFDF5" : "#FFFBEB",
                border: breakdownSum === totalOpened && totalOpened > 0
                  ? "2px solid var(--color-funded)"
                  : "2px solid var(--color-pending)",
                color: breakdownSum === totalOpened && totalOpened > 0 ? "var(--color-funded-d)" : "var(--color-pending)",
              }}
            >
              <span className="text-[13px]">Breakdown total</span>
              <span className="flex items-center gap-2 text-[16px]">
                <span className="num">{breakdownSum}</span> of <span className="num">{totalOpened}</span>
                {breakdownSum === totalOpened && totalOpened > 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
              </span>
            </div>
            <div className="mt-5">
              <button
                onClick={() => setStep(5)}
                disabled={breakdownSum !== totalOpened || totalOpened === 0}
                className="w-full rounded-2xl py-4 text-[16px] font-black flex items-center justify-center gap-2 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--color-brand-red)", padding: "18px", letterSpacing: "-0.01em" }}
              >
                Next <ArrowRight className="w-[18px] h-[18px]" />
              </button>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <PosProspectStep
              prospects={posProspects}
              onChange={setPosProspects}
              contextLabel="today"
            />
            {error && (
              <div className="text-center mt-3 text-[13px] font-bold" style={{ color: "#DC2626" }}>
                {error}
              </div>
            )}
            <div className="mt-6">
              <button
                onClick={submit}
                disabled={submitting}
                className="w-full rounded-2xl py-4 text-[16px] font-black flex items-center justify-center gap-2 transition-colors text-white disabled:opacity-40"
                style={{ background: "var(--color-brand-red)", padding: "18px", letterSpacing: "-0.01em" }}
              >
                <Check className="w-[18px] h-[18px]" /> {submitting ? "Submitting…" : "Submit report"}
              </button>
              <div className="text-center mt-2 text-[11px] font-bold" style={{ color: "var(--color-muted)" }}>
                {posProspects.length === 0
                  ? "No POS today? Just tap submit."
                  : `Submitting with ${posProspects.length} POS prospect${posProspects.length === 1 ? "" : "s"}.`}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function BigStepper({ value, onChange, min = 0 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="flex items-center justify-center gap-4 my-2 mb-6">
      <StepperBtn onClick={() => onChange(Math.max(min, value - 1))}><Minus className="w-[22px] h-[22px]" strokeWidth={2.5} /></StepperBtn>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value || "0", 10);
          onChange(Math.max(min, isNaN(v) ? 0 : v));
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
      <StepperBtn onClick={() => onChange(value + 1)}><Plus className="w-[22px] h-[22px]" strokeWidth={2.5} /></StepperBtn>
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

function TypeStepRow({
  type, value, onChange,
}: {
  type: typeof ACCOUNT_TYPES[number];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div
      className="grid items-center gap-2.5 rounded-2xl px-3.5 py-2.5"
      style={{
        gridTemplateColumns: "auto 1fr auto auto auto",
        background: "white",
        border: "1.5px solid var(--color-line)",
      }}
    >
      <span
        className="inline-flex items-center justify-center font-black rounded-lg"
        style={{
          width: 36, height: 36, fontSize: 12, letterSpacing: "-0.02em",
          background: `var(--color-${type.key}bg)`,
          color: `var(--color-${type.key})`,
        }}
      >
        {type.code}
      </span>
      <span className="font-extrabold text-[13px]" style={{ color: "var(--color-ink)" }}>{type.label}</span>
      <button onClick={() => onChange(Math.max(0, value - 1))} className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition" style={{ background: "#F1F5F9", color: "var(--color-ink)" }}>
        <Minus className="w-4 h-4" strokeWidth={2.75} />
      </button>
      <span className="num text-[18px] min-w-[28px] text-center" style={{ color: "var(--color-ink)", letterSpacing: "-0.03em" }}>{value}</span>
      <button onClick={() => onChange(value + 1)} className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition" style={{ background: "#F1F5F9", color: "var(--color-ink)" }}>
        <Plus className="w-4 h-4" strokeWidth={2.75} />
      </button>
    </div>
  );
}

function Celebration({
  acquired, totalOpened, convPct, hitGoal, onContinue,
}: {
  acquired: number;
  totalOpened: number;
  convPct: number;
  hitGoal: boolean;
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

      {convPct >= 50 && (
        <div
          className="mt-4 self-start inline-flex items-center gap-2 rounded-xl px-3.5 py-2 font-black text-[13px]"
          style={{
            background: "rgba(255,200,0,0.2)",
            border: "1.5px solid rgba(255,200,0,0.4)",
            color: "var(--color-brand-gold)",
          }}
        >
          <Award className="w-3.5 h-3.5" /> Closer of the day · {convPct}% conversion
        </div>
      )}

      <div
        className="rounded-2xl mt-7 p-5"
        style={{
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.18)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="font-extrabold text-[11px] uppercase mb-3" style={{ color: "rgba(255,255,255,0.7)", letterSpacing: "0.12em" }}>
          Today
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SummaryStat label="Opened" value={totalOpened} primary />
          <SummaryStat label="Acquired" value={acquired} />
        </div>
        <div className="mt-3 pt-3 flex justify-between font-bold text-[13px]" style={{ borderTop: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}>
          <span>Same-day conversion</span>
          <span className="num font-black text-white">{convPct}%</span>
        </div>
        {hitGoal && (
          <div className="mt-2 flex justify-between font-bold text-[13px]" style={{ color: "var(--color-brand-gold)" }}>
            <span>Daily goal</span>
            <span className="font-black">Hit ✓</span>
          </div>
        )}
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
        See your stats <ArrowRight className="w-[18px] h-[18px]" />
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
