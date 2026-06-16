"use client";

import Link from "next/link";
import { MapPin, ArrowRight, Banknote, ShieldCheck, Check } from "lucide-react";
import type { DailyReport } from "@/lib/types";
import { useActiveEvents } from "@/lib/useActiveEvents";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
function fmtFullDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${DOW[d.getDay()]} · ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

type ReportBanner = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  submitted: boolean;
  submittedSummary?: string;
};

export function HomeScreen({
  amName, goal, today, yesterday, divisionId, amId,
  retentionStatus,
  acquisitionOpen, retentionMiddayOpen, retentionEodOpen, activeRetentionSlot,
  yesterdaySnapshot,
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
  yesterdaySnapshot: { meOpened: number; teamFiled: number; teamTotal: number; teamOpened: number } | null;
}) {
  void amName; void amId; void goal;
  const todayIso = new Date().toISOString().slice(0, 10);
  const submitted = today !== null;
  const activeEvents = useActiveEvents(divisionId);

  const anyOpen = acquisitionOpen || retentionMiddayOpen || retentionEodOpen;

  const acquisitionSummary = submitted && today
    ? `${today.total_opened} opened · ${new Date(today.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : undefined;

  const retentionSummary = retentionStatus
    ? `${retentionStatus.filled_by_name} · ${new Date(retentionStatus.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : undefined;

  // Build one banner per live window
  const reportBanners: ReportBanner[] = [];
  if (acquisitionOpen) {
    reportBanners.push({
      key: "acq",
      href: "/log",
      title: "Customer Acquisition",
      subtitle: "Log accounts acquired and opened today",
      icon: <Banknote className="w-[18px] h-[18px]" style={{ color: "var(--color-brand-gold)" }} />,
      submitted,
      submittedSummary: acquisitionSummary,
    });
  }
  if (activeRetentionSlot) {
    const isEod = activeRetentionSlot === "eod";
    reportBanners.push({
      key: `ret-${activeRetentionSlot}`,
      href: "/retention",
      title: `Retention · ${isEod ? "5pm" : "12pm"} slot`,
      subtitle: "Pledges, inflow, outflow — one per team",
      icon: <ShieldCheck className="w-[18px] h-[18px]" style={{ color: "var(--color-brand-gold)" }} />,
      submitted: !!retentionStatus,
      submittedSummary: retentionSummary,
    });
  }
  // If both retention slots open simultaneously (rare), surface the EOD slot only — server picks EOD as the active one.
  if (retentionMiddayOpen && retentionEodOpen) {
    void retentionMiddayOpen; // intentionally ignored — eod wins
  }

  const allReportsDone = reportBanners.length > 0 && reportBanners.every((b) => b.submitted);

  // Full-screen waiting state — nothing open today
  if (!anyOpen) {
    return (
      <section className="px-2 pt-16 pb-8 flex flex-col items-center text-center">
        <div
          className="mb-5"
          style={{ animation: "ltFloat 3s ease-in-out infinite", display: "inline-block" }}
          aria-hidden
        >
          <div
            style={{
              fontSize: 72,
              lineHeight: 1,
              animation: "ltHourglass 3s ease-in-out infinite",
              transformOrigin: "center",
              display: "inline-block",
            }}
          >
            ⏳
          </div>
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
          No live report yet
        </h1>
        <p
          className="font-bold text-[14px] max-w-[300px]"
          style={{ color: "var(--color-body)", lineHeight: 1.55 }}
        >
          You&apos;ll see it pop up the moment one goes live — no need to refresh.
        </p>

        {yesterdaySnapshot && (
          <div
            className="mt-9 rounded-2xl px-4 py-4 max-w-[320px] w-full text-left"
            style={{ background: "white", border: "1.5px solid var(--color-line)" }}
          >
            <div
              className="font-extrabold text-[10px] uppercase mb-2"
              style={{ color: "var(--color-muted)", letterSpacing: "0.18em" }}
            >
              Yesterday
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="num font-black" style={{ fontSize: 30, lineHeight: 1, color: "var(--color-ink)", letterSpacing: "-0.04em" }}>
                {yesterdaySnapshot.meOpened}
              </span>
              <span className="font-black text-[13px]" style={{ color: "var(--color-body)" }}>
                opened by you
              </span>
            </div>
            <div className="font-bold text-[13px] mt-2" style={{ color: "var(--color-body)", lineHeight: 1.5 }}>
              Team filed{" "}
              <b className="num text-(--color-ink) font-black">
                {yesterdaySnapshot.teamFiled}/{yesterdaySnapshot.teamTotal}
              </b>
              {" "}·{" "}
              <b className="num text-(--color-ink) font-black">{yesterdaySnapshot.teamOpened}</b> accounts together.
            </div>
          </div>
        )}
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
      <div className="px-2 pt-8 flex flex-col">
        <div className="text-center font-extrabold text-[11px] uppercase" style={{ color: "var(--color-muted)", letterSpacing: "0.2em" }}>
          {fmtFullDate(todayIso)}
        </div>
        <div className="text-center mt-3 font-black text-[24px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em", lineHeight: 1.2 }}>
          {allReportsDone ? "All caught up." : "Time to log."}
        </div>
        <div className="text-center mt-2 font-bold text-[13px]" style={{ color: "var(--color-body)" }}>
          {allReportsDone
            ? "Edit any report below if you need to."
            : reportBanners.length === 1
              ? "One report is live. Tap to file."
              : `${reportBanners.length} reports are live. Tap each to file.`}
        </div>
      </div>

      {/* Report window banners */}
      <div className="px-2 mt-6 flex flex-col gap-2.5">
        {reportBanners.map((b) => (
          <ReportBannerCard key={b.key} banner={b} />
        ))}
      </div>

      {/* Yesterday context (only when no reports submitted yet) */}
      {!submitted && !retentionStatus && yesterday && (
        <div className="mx-2 mt-8 pt-5" style={{ borderTop: "1px solid var(--color-line)" }}>
          <div className="font-extrabold text-[11px] uppercase mb-2" style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}>Yesterday</div>
          <YesterdayLine r={yesterday} goal={goal} />
        </div>
      )}
    </>
  );
}

function ReportBannerCard({ banner }: { banner: ReportBanner }) {
  const submitted = banner.submitted;
  return (
    <Link
      href={banner.href}
      className="block px-4 py-3.5 rounded-2xl transition-transform active:scale-[0.99]"
      style={{
        background: submitted
          ? "linear-gradient(135deg, #16A34A, #15803D)"
          : "linear-gradient(135deg, var(--color-brand-red), var(--color-brand-red-d))",
        color: "white",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: submitted ? "rgba(255,255,255,0.2)" : "rgba(255,200,0,0.2)" }}
        >
          {submitted
            ? <Check className="w-[18px] h-[18px]" strokeWidth={3} style={{ color: "white" }} />
            : banner.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="inline-flex items-center gap-1.5 font-extrabold text-[10px] uppercase mb-1"
            style={{
              color: submitted ? "rgba(255,255,255,0.85)" : "var(--color-brand-gold)",
              letterSpacing: "0.14em",
            }}
          >
            {!submitted && (
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "var(--color-brand-gold)", boxShadow: "0 0 0 3px rgba(255,200,0,0.2)" }}
              />
            )}
            {submitted ? "Submitted" : "Live now"}
          </div>
          <div className="font-black text-[15px] truncate" style={{ letterSpacing: "-0.015em" }}>
            {banner.title}
          </div>
          <div className="font-bold text-[12px]" style={{ color: "rgba(255,255,255,0.85)" }}>
            {submitted && banner.submittedSummary ? `${banner.submittedSummary} · tap to edit` : banner.subtitle}
          </div>
        </div>
        <ArrowRight className="w-[18px] h-[18px] flex-shrink-0" />
      </div>
    </Link>
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
