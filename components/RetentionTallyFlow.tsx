"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowRight, Check, Banknote, TrendingUp, TrendingDown, ShieldCheck } from "lucide-react";

type Existing = {
  pledges_naira_m: number;
  inflow_naira_m: number;
  outflow_naira_m: number;
  retention_naira_m: number;
  filled_by_name: string;
  filled_by_initials: string;
  filled_by_color: string;
  submitted_at: string;
} | null;

type StepKey = "pledges" | "inflow" | "outflow" | "review";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "pledges",  label: "Pledges" },
  { key: "inflow",   label: "Inflow"  },
  { key: "outflow",  label: "Outflow" },
  { key: "review",   label: "Net retention" },
];

const FLAT_THRESHOLD_M = 100; // below ₦100M (positive) = flat day

export function RetentionTallyFlow({
  pcName, pcCode, amName, existing,
}: {
  pcName: string;
  pcCode: string;
  amName: string;
  existing: Existing;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pledges, setPledges]     = useState<string>(existing ? String(existing.pledges_naira_m) : "");
  const [inflow, setInflow]       = useState<string>(existing ? String(existing.inflow_naira_m) : "");
  const [outflow, setOutflow]     = useState<string>(existing ? String(existing.outflow_naira_m) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const parseNum = (s: string): number => {
    const n = parseFloat(s.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
  };
  const pledgesN = parseNum(pledges);
  const inflowN  = parseNum(inflow);
  const outflowN = parseNum(outflow);
  const netRetention = Math.round((inflowN - outflowN) * 100) / 100;

  function close() { router.push("/home"); }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/retention/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pledges_naira_m: pledgesN,
          inflow_naira_m:  inflowN,
          outflow_naira_m: outflowN,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submission failed.");
        return;
      }
      setDone(true);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Celebration
        pcName={pcName}
        pledges={pledgesN}
        inflow={inflowN}
        outflow={outflowN}
        net={netRetention}
        onContinue={() => { router.push("/home"); router.refresh(); }}
      />
    );
  }

  const current = STEPS[step];
  const isReview = current.key === "review";

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
          {STEPS.map((_, n) => (
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
          Step {step + 1} of {STEPS.length} · {pcName} ({pcCode}) · {current.label}
        </div>

        {existing && step === 0 && (
          <div
            className="mb-5 rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ background: "#FFFBEB", border: "1.5px solid var(--color-pending)" }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-extrabold flex-shrink-0"
              style={{ background: existing.filled_by_color, fontSize: 11 }}
            >
              {existing.filled_by_initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-[13px]" style={{ color: "var(--color-pending)", letterSpacing: "-0.01em" }}>
                Already filled today by {existing.filled_by_name}
              </div>
              <div className="font-bold text-[11px] mt-0.5" style={{ color: "var(--color-body)" }}>
                Your submission will overwrite theirs.
              </div>
            </div>
          </div>
        )}

        {current.key === "pledges" && (
          <InputStep
            question="Total pledges secured today?"
            sub={<>For team <b style={{ color: "var(--color-ink)" }}>{pcName}</b> · enter amount in <b style={{ color: "var(--color-ink)" }}>₦ millions</b>.</>}
            icon={<Banknote className="w-5 h-5" />}
            accent="var(--color-brand-red)"
            value={pledges}
            onChange={setPledges}
            encouragement={<PledgesEncouragement n={pledgesN} />}
          />
        )}

        {current.key === "inflow" && (
          <InputStep
            question="Total inflow today?"
            sub={<>Funds that came IN to {pcName} accounts today, in <b style={{ color: "var(--color-ink)" }}>₦ millions</b>.</>}
            icon={<TrendingUp className="w-5 h-5" />}
            accent="#16A34A"
            value={inflow}
            onChange={setInflow}
            encouragement={<InflowEncouragement n={inflowN} />}
          />
        )}

        {current.key === "outflow" && (
          <InputStep
            question="Total outflow today?"
            sub={<>Funds that LEFT {pcName} accounts today, in <b style={{ color: "var(--color-ink)" }}>₦ millions</b>.</>}
            icon={<TrendingDown className="w-5 h-5" />}
            accent="#DC2626"
            value={outflow}
            onChange={setOutflow}
            encouragement={<OutflowEncouragement n={outflowN} />}
          />
        )}

        {isReview && (
          <ReviewStep
            pcName={pcName}
            pledges={pledgesN}
            inflow={inflowN}
            outflow={outflowN}
            net={netRetention}
          />
        )}

        {error && (
          <div className="text-center mt-3 text-[13px] font-bold" style={{ color: "#DC2626" }}>
            {error}
          </div>
        )}

        <div className="mt-auto pt-6 flex flex-col gap-2">
          <button
            onClick={() => {
              if (!isReview) {
                setStep((s) => Math.min(STEPS.length - 1, s + 1));
              } else {
                submit();
              }
            }}
            disabled={submitting}
            className="w-full rounded-2xl py-4 text-[16px] font-black flex items-center justify-center gap-2 text-white disabled:opacity-40"
            style={{ background: "var(--color-brand-red)", padding: "18px", letterSpacing: "-0.01em" }}
          >
            {isReview
              ? (submitting ? "Submitting…" : <><Check className="w-[18px] h-[18px]" /> Submit retention</>)
              : <>Next <ArrowRight className="w-[18px] h-[18px]" /></>
            }
          </button>
          {step > 0 && (
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="w-full text-[13px] font-extrabold py-2"
              style={{ color: "var(--color-muted)" }}
            >
              Back
            </button>
          )}
          <div className="text-center text-[11px] font-bold mt-1" style={{ color: "var(--color-muted)" }}>
            Filed by you ({amName}) on behalf of {pcName}.
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Status interpretation for net retention
// ============================================================================

type RetentionStatus = "negative" | "flat" | "positive";

function statusOf(net: number): RetentionStatus {
  if (net < 0) return "negative";
  if (net < FLAT_THRESHOLD_M) return "flat";
  return "positive";
}

function statusLabel(s: RetentionStatus): string {
  switch (s) {
    case "negative": return "Negative retention";
    case "flat":     return "Flat day";
    case "positive": return "Positive retention";
  }
}

function statusColor(s: RetentionStatus): string {
  switch (s) {
    case "negative": return "#DC2626";
    case "flat":     return "var(--color-pending)";
    case "positive": return "#16A34A";
  }
}

function statusEmoji(s: RetentionStatus): string {
  switch (s) {
    case "negative": return "📉";
    case "flat":     return "😐";
    case "positive": return "🚀";
  }
}

function statusCopy(s: RetentionStatus, net: number): string {
  switch (s) {
    case "negative":
      return `Net outflow of ₦${fmtMoney(Math.abs(net))}M today. Time to call the major outflowers and bring them back.`;
    case "flat":
      return `Funds held steady — under ₦${FLAT_THRESHOLD_M}M net movement either way. Quiet day.`;
    case "positive":
      return `Strong retention. Customers brought in ₦${fmtMoney(net)}M more than they pulled out today.`;
  }
}

// ============================================================================
// Sub-components
// ============================================================================

function InputStep({
  question, sub, icon, accent, value, onChange, encouragement,
}: {
  question: string;
  sub: React.ReactNode;
  icon: React.ReactNode;
  accent: string;
  value: string;
  onChange: (v: string) => void;
  encouragement: React.ReactNode;
}) {
  return (
    <>
      <div className="font-black text-[24px] mb-2" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em", lineHeight: 1.25 }}>
        {question}
      </div>
      <div className="text-[13px] font-bold mb-7" style={{ color: "var(--color-body)" }}>
        {sub}
      </div>
      <BigMoneyInput value={value} onChange={onChange} accent={accent} icon={icon} />
      {encouragement}
    </>
  );
}

function ReviewStep({
  pcName, pledges, inflow, outflow, net,
}: {
  pcName: string;
  pledges: number;
  inflow: number;
  outflow: number;
  net: number;
}) {
  const s = statusOf(net);
  const color = statusColor(s);
  const emoji = statusEmoji(s);
  return (
    <>
      <div className="font-black text-[24px] mb-2" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em", lineHeight: 1.25 }}>
        Review &amp; submit
      </div>
      <div className="text-[13px] font-bold mb-5" style={{ color: "var(--color-body)" }}>
        Net retention is inflow minus outflow. We calculate it for you.
      </div>

      <div className="rounded-2xl p-3 mb-4 grid grid-cols-3 gap-2" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
        <MiniStat label="Pledges" value={pledges} />
        <MiniStat label="Inflow"  value={inflow}  positive />
        <MiniStat label="Outflow" value={outflow} negative />
      </div>

      <div
        className="rounded-2xl p-5"
        style={{ background: "white", border: `2px solid ${color}` }}
      >
        <div className="flex items-baseline justify-between mb-1">
          <div className="font-extrabold text-[11px] uppercase" style={{ color: "var(--color-muted)", letterSpacing: "0.14em" }}>
            Net retention · {pcName}
          </div>
          <div className="text-[28px]" aria-hidden>{emoji}</div>
        </div>
        <div className="num font-black" style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: "-0.04em", color }}>
          {net < 0 ? "−" : ""}₦{fmtMoney(Math.abs(net))}<span style={{ fontSize: 18, marginLeft: 2 }}>M</span>
        </div>
        <div className="mt-1 font-black text-[13px]" style={{ color }}>
          {statusLabel(s)}
        </div>
        <div className="mt-3 font-bold text-[13px]" style={{ color: "var(--color-body)", lineHeight: 1.5 }}>
          {statusCopy(s, net)}
        </div>
      </div>
    </>
  );
}

function MiniStat({ label, value, positive = false, negative = false }: { label: string; value: number; positive?: boolean; negative?: boolean }) {
  const color = positive ? "#16A34A" : negative ? "#DC2626" : "var(--color-ink)";
  return (
    <div>
      <div className="font-extrabold text-[10px] uppercase mb-1" style={{ color: "var(--color-muted)", letterSpacing: "0.1em" }}>
        {label}
      </div>
      <div className="num font-black" style={{ fontSize: 18, letterSpacing: "-0.03em", color }}>
        ₦{fmtMoney(value)}<span style={{ fontSize: 11, marginLeft: 1 }}>M</span>
      </div>
    </div>
  );
}

function PledgesEncouragement({ n }: { n: number }) {
  if (n === 0)        return <Note>💬 Type the figure in millions. e.g. 12.5 means ₦12.5M.</Note>;
  if (n < 5)          return <Note>📝 ₦{fmtMoney(n)}M in pledges — every promise counts.</Note>;
  if (n < 50)         return <Note>👍 ₦{fmtMoney(n)}M pledged today.</Note>;
  return <Note green>🔥 ₦{fmtMoney(n)}M in pledges — strong commitments coming in.</Note>;
}

function InflowEncouragement({ n }: { n: number }) {
  if (n === 0)        return <Note>💬 Total amount that flowed IN to your team&apos;s accounts.</Note>;
  if (n < 50)         return <Note>📥 ₦{fmtMoney(n)}M flowed in today.</Note>;
  if (n < 200)        return <Note green>💪 ₦{fmtMoney(n)}M inflow — strong day for deposits.</Note>;
  return <Note green>🚀 ₦{fmtMoney(n)}M inflow — exceptional.</Note>;
}

function OutflowEncouragement({ n }: { n: number }) {
  if (n === 0)        return <Note>💬 Total amount that flowed OUT of your team&apos;s accounts.</Note>;
  if (n < 50)         return <Note>📤 ₦{fmtMoney(n)}M went out today.</Note>;
  return <Note>⚠️ ₦{fmtMoney(n)}M outflow — make sure the inflow keeps pace.</Note>;
}

function Note({ children, green = false }: { children: React.ReactNode; green?: boolean }) {
  return (
    <div
      className="mt-1 rounded-2xl px-4 py-3.5 font-bold text-[14px] min-h-[60px] transition-colors"
      style={{
        background: green ? "#ECFDF5" : "white",
        border: green ? "1.5px solid #BBF7D0" : "1.5px solid var(--color-line)",
        color: green ? "var(--color-funded-d)" : "var(--color-body)",
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

function BigMoneyInput({
  value, onChange, accent, icon,
}: {
  value: string;
  onChange: (v: string) => void;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center my-2 mb-3">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: "white", border: "1.5px solid var(--color-line)", color: accent }}
      >
        {icon}
      </div>
      <div
        className="rounded-[20px] flex items-center justify-center w-full max-w-[300px]"
        style={{
          background: "white",
          border: "2px solid var(--color-line)",
          padding: "14px 18px",
        }}
      >
        <span className="font-black num mr-2" style={{ fontSize: 36, color: "var(--color-muted)", letterSpacing: "-0.03em" }}>
          ₦
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^\d.]/g, "");
            const parts = cleaned.split(".");
            const next = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}` : cleaned;
            onChange(next);
          }}
          placeholder="0"
          autoFocus
          className="num font-black outline-none text-center min-w-0"
          style={{
            flex: 1,
            background: "transparent",
            color: "var(--color-ink)",
            fontSize: 48,
            letterSpacing: "-0.04em",
            MozAppearance: "textfield",
          }}
        />
        <span className="font-extrabold ml-2" style={{ fontSize: 16, color: "var(--color-muted)", letterSpacing: "0.04em" }}>
          M
        </span>
      </div>
    </div>
  );
}

function fmtMoney(n: number): string {
  if (n === 0) return "0";
  if (n < 1) return n.toFixed(2);
  if (n < 10) return n.toFixed(1);
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function Celebration({
  pcName, pledges, inflow, outflow, net, onContinue,
}: {
  pcName: string;
  pledges: number;
  inflow: number;
  outflow: number;
  net: number;
  onContinue: () => void;
}) {
  const s = statusOf(net);
  const color = statusColor(s);
  const emoji = statusEmoji(s);

  return (
    <section
      className="fixed z-[300] flex flex-col"
      style={{
        inset: 0,
        marginInline: "auto",
        maxWidth: 430,
        background: "linear-gradient(165deg, #0F172A 0%, #1F2937 100%)",
        paddingTop: 60,
        paddingBottom: 32,
        paddingLeft: 28,
        paddingRight: 28,
      }}
    >
      <div
        className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-4"
        style={{ background: "rgba(255,200,0,0.18)", color: "var(--color-brand-gold)" }}
      >
        <ShieldCheck className="w-10 h-10" strokeWidth={2.5} />
      </div>
      <div className="text-white font-black text-[30px]" style={{ letterSpacing: "-0.03em", lineHeight: 1.1 }}>
        Retention filed
      </div>
      <div className="text-white/70 font-bold text-[13px] mt-1.5">
        {pcName} · {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
      </div>

      <div
        className="rounded-2xl mt-7 p-5"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: `1px solid ${color}55`,
        }}
      >
        <div className="flex items-baseline justify-between mb-1">
          <div className="font-extrabold text-[11px] uppercase" style={{ color: "rgba(255,255,255,0.7)", letterSpacing: "0.14em" }}>
            Net retention today
          </div>
          <div className="text-[28px]" aria-hidden>{emoji}</div>
        </div>
        <div className="num font-black" style={{ fontSize: 48, lineHeight: 1, letterSpacing: "-0.04em", color }}>
          {net < 0 ? "−" : ""}₦{fmtMoney(Math.abs(net))}<span style={{ fontSize: 20, marginLeft: 2 }}>M</span>
        </div>
        <div className="mt-1 font-black text-[14px]" style={{ color }}>
          {statusLabel(s)}
        </div>
        <div className="mt-3 font-bold text-[13px]" style={{ color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
          {statusCopy(s, net)}
        </div>
      </div>

      <div
        className="rounded-2xl mt-3 p-4 grid grid-cols-3 gap-2"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <DarkMiniStat label="Pledges" value={pledges} />
        <DarkMiniStat label="Inflow"  value={inflow}  positive />
        <DarkMiniStat label="Outflow" value={outflow} negative />
      </div>

      <button
        onClick={onContinue}
        className="mt-auto w-full rounded-2xl py-4.5 text-[16px] font-black flex items-center justify-center gap-2"
        style={{ background: "var(--color-brand-gold)", color: "var(--color-ink)", padding: 18 }}
      >
        Back to home <ArrowRight className="w-[18px] h-[18px]" />
      </button>
    </section>
  );
}

function DarkMiniStat({ label, value, positive = false, negative = false }: { label: string; value: number; positive?: boolean; negative?: boolean }) {
  const color = positive ? "#34D399" : negative ? "#FCA5A5" : "white";
  return (
    <div>
      <div className="font-extrabold text-[10px] uppercase mb-1" style={{ color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em" }}>
        {label}
      </div>
      <div className="num font-black" style={{ fontSize: 18, letterSpacing: "-0.03em", color }}>
        ₦{fmtMoney(value)}<span style={{ fontSize: 11, marginLeft: 1 }}>M</span>
      </div>
    </div>
  );
}
