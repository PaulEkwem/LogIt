"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, Plus, Minus, Check, ArrowRight, Users, Award } from "lucide-react";
import { ACCOUNT_TYPES, type Event, type TypeKey } from "@/lib/types";

type OwnReport = {
  acquired: number;
  type_t1: number;
  type_t3: number;
  type_gt: number;
  type_sm: number;
  type_sk: number;
  submitted_at: string;
  edited_at: string | null;
} | null;

type PcReportRow = {
  am_id: string;
  acquired: number;
  am: { full_name: string; initials: string; color: string };
};

type DivisionAgg = { total_acquired: number; total_participants: number };

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtShort(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function EventScreen({
  event, ownReport, pcReports, divisionAgg, canSubmit,
}: {
  event: Event;
  ownReport: OwnReport;
  pcReports: PcReportRow[];
  divisionAgg: DivisionAgg;
  canSubmit: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [acquired, setAcquired] = useState(ownReport?.acquired ?? 0);
  const [byType, setByType] = useState<Record<TypeKey, number>>({
    t1: ownReport?.type_t1 ?? 0,
    gt: ownReport?.type_gt ?? 0,
    t3: ownReport?.type_t3 ?? 0,
    sm: ownReport?.type_sm ?? 0,
    sk: ownReport?.type_sk ?? 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const breakdownSum = Object.values(byType).reduce((s, v) => s + v, 0);
  const dateLabel = event.start_date === event.end_date
    ? fmtShort(event.start_date)
    : `${fmtShort(event.start_date)} – ${fmtShort(event.end_date)}`;

  const pcSorted = [...pcReports].sort((a, b) => b.acquired - a.acquired);
  const pcTotal = pcSorted.reduce((s, r) => s + r.acquired, 0);

  async function submit() {
    setError(null);
    if (breakdownSum !== acquired) {
      setError("Breakdown must sum to acquired.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${event.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acquired, types: byType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submit failed.");
      } else {
        setShowForm(false);
        router.refresh();
      }
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Event header */}
      <div className="px-2 pt-6">
        <div
          className="rounded-2xl px-5 py-4"
          style={{ background: "linear-gradient(135deg, var(--color-brand-red), var(--color-brand-red-d))" }}
        >
          <div
            className="font-extrabold text-[10px] uppercase mb-1"
            style={{ color: "rgba(255,255,255,0.7)", letterSpacing: "0.12em" }}
          >
            {event.status === "closed" ? "Closed campaign" : "Active campaign"}
          </div>
          <div className="font-black text-[22px] text-white" style={{ letterSpacing: "-0.025em", lineHeight: 1.2 }}>
            {event.name}
          </div>
          <div className="flex items-center gap-4 mt-2 text-white text-[13px] font-bold">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {event.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {dateLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Hero — division-wide aggregate */}
      <div className="px-2 pt-9 flex flex-col">
        <div
          className="text-center font-extrabold text-[11px] uppercase"
          style={{ color: "var(--color-muted)", letterSpacing: "0.2em" }}
        >
          Division total acquired
        </div>
        <div className="flex items-baseline justify-center gap-1.5 mt-7">
          <span className="num" style={{ fontSize: 108, lineHeight: 0.9, letterSpacing: "-0.07em", color: "var(--color-ink)" }}>
            {divisionAgg.total_acquired}
          </span>
        </div>
        <div className="text-center mt-4 text-[15px] font-bold" style={{ color: "var(--color-body)" }}>
          Across <b className="num text-(--color-ink) font-black">{divisionAgg.total_participants}</b> participating AM{divisionAgg.total_participants === 1 ? "" : "s"}.
        </div>
      </div>

      {/* AM's own status / CTA */}
      {canSubmit && !showForm && (
        <div className="px-2 mt-8">
          {ownReport ? (
            <div
              className="rounded-2xl px-4 py-4"
              style={{ background: "#ECFDF5", border: "1.5px solid var(--color-funded)" }}
            >
              <div className="font-extrabold text-[10px] uppercase mb-1" style={{ color: "var(--color-funded-d)", letterSpacing: "0.12em" }}>
                You logged
              </div>
              <div className="font-black text-[28px]" style={{ color: "var(--color-funded-d)", letterSpacing: "-0.03em" }}>
                <span className="num">{ownReport.acquired}</span> acquired
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 w-full rounded-xl py-2.5 font-extrabold text-[13px] transition-colors"
                style={{ background: "white", color: "var(--color-funded-d)", border: "1.5px solid var(--color-funded)" }}
              >
                Edit my numbers
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full rounded-2xl py-4 text-[16px] font-black flex items-center justify-center gap-2 text-white"
              style={{ background: "var(--color-brand-red)", padding: 18 }}
            >
              <Plus className="w-[18px] h-[18px]" />
              Log my numbers for this event
            </button>
          )}
        </div>
      )}

      {/* Inline form */}
      {showForm && canSubmit && (
        <div className="px-2 mt-6">
          <div className="rounded-2xl p-5" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
            <div className="font-extrabold text-[10px] uppercase mb-1" style={{ color: "var(--color-muted)", letterSpacing: "0.12em" }}>
              Your event log
            </div>
            <div className="font-black text-[18px] mb-4" style={{ color: "var(--color-ink)", letterSpacing: "-0.02em" }}>
              How many did you acquire at this event?
            </div>

            <div className="flex items-center justify-center gap-3 mb-4">
              <StepperBtn onClick={() => setAcquired(Math.max(0, acquired - 1))}><Minus className="w-5 h-5" strokeWidth={2.5} /></StepperBtn>
              <input
                type="number"
                inputMode="numeric"
                value={acquired}
                onChange={(e) => {
                  const v = parseInt(e.target.value || "0", 10);
                  setAcquired(Math.max(0, isNaN(v) ? 0 : v));
                }}
                className="w-[100px] h-[80px] rounded-xl text-center font-black outline-none num"
                style={{
                  background: "var(--color-bg)",
                  border: "2px solid var(--color-line)",
                  color: "var(--color-ink)",
                  fontSize: 48,
                  letterSpacing: "-0.04em",
                  MozAppearance: "textfield",
                }}
              />
              <StepperBtn onClick={() => setAcquired(acquired + 1)}><Plus className="w-5 h-5" strokeWidth={2.5} /></StepperBtn>
            </div>

            <div className="font-extrabold text-[10px] uppercase mb-2.5 mt-5" style={{ color: "var(--color-muted)", letterSpacing: "0.12em" }}>
              Breakdown by type
            </div>
            <div className="flex flex-col gap-1.5">
              {ACCOUNT_TYPES.map((t) => (
                <div
                  key={t.key}
                  className="grid items-center gap-2 rounded-xl px-3 py-2"
                  style={{
                    gridTemplateColumns: "auto 1fr auto auto auto",
                    background: "var(--color-bg)",
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center font-black rounded-lg"
                    style={{
                      width: 30, height: 30, fontSize: 11, letterSpacing: "-0.02em",
                      background: `var(--color-${t.key}bg)`,
                      color: `var(--color-${t.key})`,
                    }}
                  >
                    {t.code}
                  </span>
                  <span className="font-extrabold text-[12px]" style={{ color: "var(--color-ink)" }}>{t.label}</span>
                  <button
                    onClick={() => setByType((b) => ({ ...b, [t.key]: Math.max(0, b[t.key] - 1) }))}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "#F1F5F9", color: "var(--color-ink)" }}
                  >
                    <Minus className="w-3.5 h-3.5" strokeWidth={2.75} />
                  </button>
                  <span className="num text-[16px] min-w-[24px] text-center" style={{ color: "var(--color-ink)" }}>
                    {byType[t.key]}
                  </span>
                  <button
                    onClick={() => setByType((b) => ({ ...b, [t.key]: b[t.key] + 1 }))}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "#F1F5F9", color: "var(--color-ink)" }}
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.75} />
                  </button>
                </div>
              ))}
            </div>

            <div
              className="mt-4 rounded-xl px-3.5 py-3 flex justify-between items-center font-black text-[13px]"
              style={{
                background: breakdownSum === acquired && acquired > 0 ? "#ECFDF5" : "#FFFBEB",
                border: breakdownSum === acquired && acquired > 0 ? "1.5px solid var(--color-funded)" : "1.5px solid var(--color-pending)",
                color: breakdownSum === acquired && acquired > 0 ? "var(--color-funded-d)" : "var(--color-pending)",
              }}
            >
              <span>Breakdown total</span>
              <span><span className="num">{breakdownSum}</span> of <span className="num">{acquired}</span></span>
            </div>

            {error && (
              <div className="text-center mt-3 text-[13px] font-bold" style={{ color: "#DC2626" }}>
                {error}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-xl py-3 font-extrabold text-[13px]"
                style={{ background: "white", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting || acquired === 0 || breakdownSum !== acquired}
                className="flex-[2] rounded-xl py-3 font-black text-[14px] flex items-center justify-center gap-2 text-white disabled:opacity-40"
                style={{ background: "var(--color-brand-red)" }}
              >
                <Check className="w-4 h-4" /> {submitting ? "Saving…" : (ownReport ? "Update" : "Submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Your PC's contribution */}
      {pcSorted.length > 0 && (
        <Section label={`Your PC's contribution (${pcTotal})`}>
          <div className="mt-1">
            {pcSorted.map((r, i) => (
              <div
                key={r.am_id}
                className="grid items-center gap-3 py-2.5"
                style={{
                  gridTemplateColumns: "32px 1fr auto",
                  borderTop: i === 0 ? "none" : "1px solid #F1F5F9",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-extrabold"
                  style={{ background: r.am.color, fontSize: 11 }}
                >
                  {r.am.initials}
                </div>
                <div className="font-extrabold text-[14px]" style={{ color: "var(--color-ink)" }}>
                  {r.am.full_name}
                </div>
                <div className="num text-[18px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.02em" }}>
                  {r.acquired}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section label="Division aggregate">
        <div className="grid grid-cols-2 gap-3 mt-2">
          <Tile icon={<Users className="w-4 h-4" />} value={divisionAgg.total_participants} label="Participants" />
          <Tile icon={<Award className="w-4 h-4" />} value={divisionAgg.total_acquired} label="Total acquired" />
        </div>
        <div
          className="mt-4 text-[12px] font-bold text-center"
          style={{ color: "var(--color-muted)", letterSpacing: "-0.005em" }}
        >
          Per-AM contributions from other PCs are private. You see the total only.
        </div>
      </Section>
    </>
  );
}

function StepperBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
      style={{ background: "white", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
    >
      {children}
    </button>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mx-2 mt-8 pt-5.5" style={{ borderTop: "1px solid var(--color-line)", paddingTop: 22 }}>
      <div
        className="font-extrabold text-[11px] uppercase mb-1.5"
        style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Tile({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div
      className="rounded-2xl px-4 py-3.5"
      style={{ background: "white", border: "1.5px solid var(--color-line)" }}
    >
      <div className="font-extrabold text-[10px] uppercase mb-1 flex items-center gap-1.5" style={{ color: "var(--color-muted)", letterSpacing: "0.1em" }}>
        {icon}
        {label}
      </div>
      <div className="num text-[28px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.03em", lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}
