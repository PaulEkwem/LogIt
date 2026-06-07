"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Minus, ArrowRight, Check, CheckCircle2, Circle } from "lucide-react";
import { ACCOUNT_TYPES, type PosProspect, type TypeKey } from "@/lib/types";
import { PosProspectStep, cleanProspects, validateProspects } from "./PosProspectStep";

type ExistingEventReport = {
  acquired: number;
  total_opened: number;
  type_t1: number;
  type_t3: number;
  type_gt: number;
  type_sm: number;
  type_sk: number;
  pos_prospects?: PosProspect[];
} | null;

const TOTAL_STEPS = 4;

export function EventTallyFlow({
  eventId, existing, onClose,
}: {
  eventId: string;
  existing: ExistingEventReport;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [acquired, setAcquired] = useState(existing?.acquired ?? 0);
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

  const breakdownSum = Object.values(byType).reduce((s, v) => s + v, 0);

  function setOpenedSafe(v: number) {
    setTotalOpened(Math.max(0, Math.min(acquired, v)));
  }

  async function submit() {
    setError(null);
    if (breakdownSum !== totalOpened) {
      setError("Breakdown must sum to opened.");
      return;
    }
    const cleanedPos = cleanProspects(posProspects);
    const posErr = validateProspects(cleanedPos);
    if (posErr) { setError(posErr); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acquired, total_opened: totalOpened, types: byType, pos_prospects: cleanedPos }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submit failed.");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="fixed z-[200] flex flex-col"
      style={{
        inset: 0,
        marginInline: "auto",
        maxWidth: 430,
        background: "var(--color-bg)",
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between">
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.06)", color: "var(--color-ink)" }}
        >
          <X className="w-[18px] h-[18px]" />
        </button>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className="w-6 h-1 rounded-full transition-colors"
              style={{ background: n <= step ? "var(--color-brand-red)" : "var(--color-line)" }}
            />
          ))}
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 min-h-0 px-6 pb-8 flex flex-col animate-[fadeIn_0.22s_ease-out] overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="font-extrabold text-[10px] uppercase mb-2" style={{ color: "var(--color-muted)", letterSpacing: "0.14em" }}>
          Step {step} of {TOTAL_STEPS} · {step === 1 ? "Acquired at event" : step === 2 ? "Opened on-site" : step === 3 ? "Breakdown" : "POS prospects"}
        </div>

        {step === 1 && (
          <>
            <div className="font-black text-[24px] mb-8" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em", lineHeight: 1.25 }}>
              How many accounts or prospects did you acquire at this event?
            </div>
            <BigStepper value={acquired} onChange={(v) => {
              setAcquired(v);
              if (totalOpened > v) setTotalOpened(v);
            }} />
            <Encouragement>
              {acquired === 0
                ? "Count every prospect you signed up at the campaign."
                : <><b className="num">{acquired}</b> {acquired === 1 ? "prospect" : "prospects"} acquired at this campaign.</>
              }
            </Encouragement>
            <Footer onNext={() => setStep(2)} disabled={acquired === 0} />
          </>
        )}

        {step === 2 && (
          <>
            <div className="font-black text-[24px] mb-8" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em", lineHeight: 1.25 }}>
              Of those <span className="num">{acquired}</span>, how many were opened on-site?
            </div>
            <BigStepper value={totalOpened} onChange={setOpenedSafe} max={acquired} />
            <Encouragement>
              {totalOpened === 0
                ? "On-site openings only — via GTWorld or Orange Tool Box during the event."
                : totalOpened === acquired
                  ? <>All <b className="num">{acquired}</b> opened on-site. Closing the gap on the floor.</>
                  : <><b className="num">{totalOpened}</b> of <b className="num">{acquired}</b> opened on-site — <b className="num">{Math.round((totalOpened / acquired) * 100)}%</b> conversion.</>
              }
            </Encouragement>
            <Footer onNext={() => setStep(3)} />
          </>
        )}

        {step === 3 && (
          <>
            <div className="font-black text-[24px] mb-8" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em", lineHeight: 1.25 }}>
              How were the <span className="num">{totalOpened}</span> opened accounts split across types?
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
                {breakdownSum === totalOpened && totalOpened > 0
                  ? <CheckCircle2 className="w-3.5 h-3.5" />
                  : <Circle className="w-3.5 h-3.5" />}
              </span>
            </div>
            <div className="mt-5">
              <button
                onClick={() => setStep(4)}
                disabled={breakdownSum !== totalOpened}
                className="w-full rounded-2xl py-4 text-[16px] font-black flex items-center justify-center gap-2 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--color-brand-red)", padding: "18px", letterSpacing: "-0.01em" }}
              >
                Next <ArrowRight className="w-[18px] h-[18px]" />
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <PosProspectStep
              prospects={posProspects}
              onChange={setPosProspects}
              contextLabel="at this event"
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
                <Check className="w-[18px] h-[18px]" /> {submitting ? "Saving…" : "Submit"}
              </button>
              <div className="text-center mt-2 text-[11px] font-bold" style={{ color: "var(--color-muted)" }}>
                {posProspects.length === 0
                  ? "No POS at this event? Just tap submit."
                  : `Submitting with ${posProspects.length} POS prospect${posProspects.length === 1 ? "" : "s"}.`}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function BigStepper({ value, onChange, max }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex items-center justify-center gap-4 my-2 mb-6">
      <StepperBtn onClick={() => onChange(Math.max(0, value - 1))}><Minus className="w-[22px] h-[22px]" strokeWidth={2.5} /></StepperBtn>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value || "0", 10);
          const safe = Math.max(0, isNaN(v) ? 0 : v);
          onChange(typeof max === "number" ? Math.min(max, safe) : safe);
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
      <StepperBtn onClick={() => onChange(typeof max === "number" ? Math.min(max, value + 1) : value + 1)}>
        <Plus className="w-[22px] h-[22px]" strokeWidth={2.5} />
      </StepperBtn>
    </div>
  );
}

function StepperBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95"
      style={{ background: "white", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
    >
      {children}
    </button>
  );
}

function Encouragement({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-2 rounded-2xl px-4 py-3.5 font-bold text-[14px] min-h-[60px]"
      style={{
        background: "white",
        border: "1.5px solid var(--color-line)",
        color: "var(--color-body)",
        lineHeight: 1.5,
        letterSpacing: "-0.005em",
      }}
    >
      {children}
    </div>
  );
}

function Footer({ onNext, disabled = false }: { onNext: () => void; disabled?: boolean }) {
  return (
    <div className="mt-auto pt-6">
      <button
        onClick={onNext}
        disabled={disabled}
        className="w-full rounded-2xl py-4 text-[16px] font-black flex items-center justify-center gap-2 text-white disabled:opacity-40"
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
