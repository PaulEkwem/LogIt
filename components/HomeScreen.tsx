"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, MapPin, ArrowRight, Lock, Clock } from "lucide-react";
import type { DailyReport } from "@/lib/types";
import { useActiveEvents } from "@/lib/useActiveEvents";
import { ReportTypeSheet } from "./ReportTypeSheet";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
function fmtFullDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${DOW[d.getDay()]} · ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function HomeScreen({
  amName, goal, today, yesterday, divisionId, amId,
  retentionStatus,
  acquisitionOpen, retentionMiddayOpen, retentionEodOpen, activeRetentionSlot,
}: {
  amName: string;
  goal: number;
  today: DailyReport | null;
  yesterday: DailyReport | null;
  divisionId: string;
  amId: string;
  retentionStatus: { filled_by_name: string; submitted_at: string; retention_m: number } | null;
  acquisitionOpen: boolean;
  retentionMiddayOpen: boolean;
  retentionEodOpen: boolean;
  activeRetentionSlot: "midday" | "eod" | null;
}) {
  void amName; void amId; void goal;
  const todayIso = new Date().toISOString().slice(0, 10);
  const submitted = today !== null;
  const activeEvents = useActiveEvents(divisionId);
  const [sheetOpen, setSheetOpen] = useState(false);

  const anyOpen = acquisitionOpen || retentionMiddayOpen || retentionEodOpen;

  const acquisitionSummary = submitted && today
    ? `${today.total_opened} opened · ${new Date(today.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : undefined;

  const retentionSummary = retentionStatus
    ? `${retentionStatus.filled_by_name} · ${new Date(retentionStatus.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : undefined;

  // Full-screen waiting state — nothing open today
  if (!anyOpen) {
    return (
      <section className="px-2 pt-16 pb-8 flex flex-col items-center text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: "var(--color-ink)", color: "var(--color-brand-gold)" }}
        >
          <Lock className="w-8 h-8" strokeWidth={2.25} />
        </div>
        <div
          className="font-extrabold text-[11px] uppercase mb-2"
          style={{ color: "var(--color-muted)", letterSpacing: "0.2em" }}
        >
          {fmtFullDate(todayIso)}
        </div>
        <h1
          className="font-black text-[26px] mb-2"
          style={{ color: "var(--color-ink)", letterSpacing: "-0.025em", lineHeight: 1.2 }}
        >
          Today&apos;s report isn&apos;t open yet
        </h1>
        <p
          className="font-bold text-[14px] max-w-[300px]"
          style={{ color: "var(--color-body)", lineHeight: 1.55 }}
        >
          Blessing will open it shortly. You&apos;ll see it pop up the moment she does — no need to refresh.
        </p>

        <div
          className="mt-9 rounded-2xl px-4 py-3.5 flex items-center gap-3 max-w-[320px]"
          style={{ background: "white", border: "1.5px solid var(--color-line)" }}
        >
          <Clock className="w-5 h-5 flex-shrink-0" style={{ color: "var(--color-muted)" }} />
          <div className="text-left">
            <div className="font-black text-[12px]" style={{ color: "var(--color-ink)" }}>
              Reports typically open at
            </div>
            <div className="font-bold text-[12px] mt-0.5" style={{ color: "var(--color-body)" }}>
              Retention 12:00 · Retention 17:00 · Acquisition throughout the day
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Active campaign banner */}
      {activeEvents.length > 0 && (
        <div className="mb-3 -mx-2" style={{ marginTop: -8 }}>
          {activeEvents.map((ev) => (
            <Link
              key={ev.id}
              href={`/event/${ev.id}`}
              className="block px-4 py-3.5 rounded-2xl mb-2 transition-colors"
              style={{ background: "linear-gradient(135deg, var(--color-brand-red), var(--color-brand-red-d))", color: "white" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,200,0,0.2)" }}>
                  <MapPin className="w-[18px] h-[18px]" style={{ color: "var(--color-brand-gold)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 font-extrabold text-[10px] uppercase mb-1" style={{ color: "var(--color-brand-gold)", letterSpacing: "0.14em" }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-brand-gold)", boxShadow: "0 0 0 3px rgba(255,200,0,0.2)" }} />
                    Live now
                  </div>
                  <div className="font-black text-[15px] truncate" style={{ letterSpacing: "-0.015em" }}>{ev.name}</div>
                  <div className="font-bold text-[12px]" style={{ color: "rgba(255,255,255,0.8)" }}>{ev.location}</div>
                </div>
                <ArrowRight className="w-[18px] h-[18px] flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Date + status */}
      <div className="px-2 pt-10 flex flex-col">
        <div className="text-center font-extrabold text-[11px] uppercase" style={{ color: "var(--color-muted)", letterSpacing: "0.2em" }}>
          {fmtFullDate(todayIso)}
        </div>
        <div className="text-center mt-3 font-black text-[26px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em", lineHeight: 1.2 }}>
          {submitted ? "All set for today." : "What did you do today?"}
        </div>
        {submitted && acquisitionSummary && (
          <div className="text-center mt-2 font-bold text-[14px]" style={{ color: "var(--color-body)" }}>
            Customer Acquisition · <span className="num" style={{ color: "var(--color-ink)" }}>{acquisitionSummary}</span>
          </div>
        )}
      </div>

      {/* Primary CTA */}
      <div className="px-2 mt-8">
        <button
          onClick={() => setSheetOpen(true)}
          className="w-full rounded-2xl py-4 text-[16px] font-black flex items-center justify-center gap-2 text-white transition-colors active:scale-[0.99]"
          style={{ background: "var(--color-brand-red)", padding: "18px", letterSpacing: "-0.01em" }}
        >
          <Plus className="w-[20px] h-[20px]" strokeWidth={2.5} />
          {submitted ? "Add another report" : "Add report"}
        </button>
        <div className="text-center mt-2.5 text-[11px] font-bold" style={{ color: "var(--color-muted)", letterSpacing: "0.01em" }}>
          Tap to choose a report type
        </div>
      </div>

      {/* Yesterday context (only when nothing's logged today) */}
      {!submitted && yesterday && (
        <div className="mx-2 mt-10 pt-5" style={{ borderTop: "1px solid var(--color-line)" }}>
          <div className="font-extrabold text-[11px] uppercase mb-2" style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}>Yesterday</div>
          <YesterdayLine r={yesterday} goal={goal} />
        </div>
      )}

      <ReportTypeSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        acquisitionStatus={submitted ? "logged" : "pending"}
        acquisitionSummary={acquisitionSummary}
        acquisitionOpen={acquisitionOpen}
        retentionStatus={retentionStatus ? "logged" : "pending"}
        retentionSummary={retentionSummary}
        activeRetentionSlot={activeRetentionSlot}
      />
    </>
  );
}

function YesterdayLine({ r, goal }: { r: DailyReport; goal: number }) {
  const conv = r.acquired > 0 ? Math.round((r.opened_same_day / r.acquired) * 100) : 0;
  const hitGoal = r.total_opened >= goal;
  return (
    <p className="font-bold text-[14px]" style={{ color: "var(--color-ink)", lineHeight: 1.55, letterSpacing: "-0.005em" }}>
      <b className="num">{r.total_opened}</b> opened · <b className="num">{conv}%</b> same-day conversion
      {hitGoal && " · goal hit"}
    </p>
  );
}
