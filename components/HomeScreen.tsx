"use client";

import Link from "next/link";
import { Edit3, Check, Flame, Award, MapPin, ArrowRight, Banknote, Users, Target, Clock, Sparkles } from "lucide-react";
import type { DailyReport } from "@/lib/types";
import { useActiveEvents } from "@/lib/useActiveEvents";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
function fmtFullDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${DOW[d.getDay()]} · ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function HomeScreen({
  amName,
  goal,
  today,
  yesterday,
  divisionId,
  amId,
}: {
  amName: string;
  goal: number;
  today: DailyReport | null;
  yesterday: DailyReport | null;
  divisionId: string;
  amId: string;
}) {
  void amName; void amId;
  const todayIso = new Date().toISOString().slice(0, 10);
  const submitted = today !== null;
  const activeEvents = useActiveEvents(divisionId);

  // The reports the AM can log today. Only Customer Acquisition is wired for now;
  // others render as "coming soon" placeholders. Admin enables them later.
  const activeCount = 1;
  const doneCount = submitted ? 1 : 0;

  return (
    <>
      {/* Active campaign banner — appears live via realtime when admin creates an event */}
      {activeEvents.length > 0 && (
        <div className="mb-3 -mx-2" style={{ marginTop: -8 }}>
          {activeEvents.map((ev) => (
            <Link
              key={ev.id}
              href={`/event/${ev.id}`}
              className="block px-4 py-3.5 rounded-2xl mb-2 transition-colors"
              style={{
                background: "linear-gradient(135deg, var(--color-brand-red), var(--color-brand-red-d))",
                color: "white",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,200,0,0.2)" }}
                >
                  <MapPin className="w-[18px] h-[18px]" style={{ color: "var(--color-brand-gold)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="inline-flex items-center gap-1.5 font-extrabold text-[10px] uppercase mb-1"
                    style={{ color: "var(--color-brand-gold)", letterSpacing: "0.14em" }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: "var(--color-brand-gold)", boxShadow: "0 0 0 3px rgba(255,200,0,0.2)" }}
                    />
                    Live now
                  </div>
                  <div className="font-black text-[15px] truncate" style={{ letterSpacing: "-0.015em" }}>
                    {ev.name}
                  </div>
                  <div className="font-bold text-[12px]" style={{ color: "rgba(255,255,255,0.8)" }}>
                    {ev.location}
                  </div>
                </div>
                <ArrowRight className="w-[18px] h-[18px] flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Date + status */}
      <div className="px-2 pt-6">
        <div
          className="text-center font-extrabold text-[11px] uppercase"
          style={{ color: "var(--color-muted)", letterSpacing: "0.2em" }}
        >
          {fmtFullDate(todayIso)}
        </div>
        <div className="text-center mt-2 font-bold text-[13px]" style={{ color: "var(--color-body)" }}>
          {doneCount === activeCount
            ? <>All reports logged today <Check className="inline w-3.5 h-3.5" style={{ color: "var(--color-funded)" }} /></>
            : <><b className="num" style={{ color: "var(--color-ink)" }}>{doneCount} of {activeCount}</b> {activeCount === 1 ? "report" : "reports"} logged today</>
          }
        </div>
      </div>

      {/* Today's reports */}
      <div
        className="mx-2 mt-7 pt-5"
        style={{ borderTop: "1px solid var(--color-line)" }}
      >
        <div
          className="font-extrabold text-[11px] uppercase mb-3"
          style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}
        >
          Today's reports
        </div>

        {/* ACQUISITION — real, wired */}
        <AcquisitionCard
          goal={goal}
          today={today}
          submitted={submitted}
        />

        {/* PLACEHOLDERS */}
        <PlaceholderCard
          icon={<Users className="w-5 h-5" />}
          title="Customer Retention"
          tagline="Track follow-ups and at-risk accounts"
        />
        <PlaceholderCard
          icon={<Target className="w-5 h-5" />}
          title="Cross-selling"
          tagline="Log products offered and taken"
        />
      </div>

      {/* Yesterday strip */}
      {!submitted && yesterday && (
        <div
          className="mx-2 mt-8 pt-5"
          style={{ borderTop: "1px solid var(--color-line)" }}
        >
          <div
            className="font-extrabold text-[11px] uppercase mb-2.5"
            style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}
          >
            Yesterday
          </div>
          <YesterdayLine r={yesterday} goal={goal} />
        </div>
      )}
    </>
  );
}

function AcquisitionCard({
  goal, today, submitted,
}: { goal: number; today: DailyReport | null; submitted: boolean }) {
  const time = submitted && today
    ? new Date(today.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  const fromEarlier = today ? Math.max(0, today.total_opened - today.opened_same_day) : 0;
  const conv = today && today.acquired > 0 ? Math.round((today.opened_same_day / today.acquired) * 100) : 0;
  const hitGoal = today ? today.total_opened >= goal : false;

  return (
    <div
      className="rounded-2xl mb-3 overflow-hidden"
      style={{ background: "white", border: "1.5px solid var(--color-line)" }}
    >
      <div className="px-4 pt-3.5 pb-3 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(206,17,38,0.08)", color: "var(--color-brand-red)" }}
        >
          <Banknote className="w-5 h-5" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="inline-flex items-center gap-1.5 font-extrabold text-[10px] uppercase mb-0.5"
            style={{
              color: submitted ? "var(--color-funded)" : "var(--color-pending)",
              letterSpacing: "0.14em",
            }}
          >
            {submitted ? (
              <><Check className="w-3 h-3" strokeWidth={3} /> Logged · {time}</>
            ) : (
              <><span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-pending)" }} /> Pending</>
            )}
          </div>
          <div className="font-black text-[15px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.015em" }}>
            Customer Acquisition
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-3 border-t" style={{ borderColor: "var(--color-line)", paddingTop: 12 }}>
        {submitted && today ? (
          <p
            className="font-bold text-[14px]"
            style={{ color: "var(--color-ink)", lineHeight: 1.5, letterSpacing: "-0.005em" }}
          >
            <b className="num">{today.total_opened}</b> opened from <b className="num">{today.acquired}</b> acquired —{" "}
            <b className="num">{today.opened_same_day}</b> today, <b className="num">{fromEarlier}</b> from earlier pipeline.
          </p>
        ) : (
          <div
            className="font-bold text-[13px]"
            style={{ color: "var(--color-body)" }}
          >
            Daily target: <b className="num" style={{ color: "var(--color-ink)" }}>{goal} opened</b>
          </div>
        )}

        {submitted && today && (
          <div className="flex gap-1.5 flex-wrap mt-2.5">
            {hitGoal && <Pill icon={<Check className="w-3.5 h-3.5" />} tone="green">Hit your goal</Pill>}
            <Pill icon={<Flame className="w-3.5 h-3.5" />} tone="gold">Streak +1</Pill>
            {conv >= 50 && <Pill icon={<Award className="w-3.5 h-3.5" />} tone="gold">Closer · {conv}%</Pill>}
          </div>
        )}
      </div>

      {/* Action */}
      <Link
        href="/log"
        className="block px-4 py-3 font-extrabold text-[13px] flex items-center justify-center gap-2 transition-colors"
        style={{
          background: submitted ? "var(--color-bg)" : "var(--color-brand-red)",
          color: submitted ? "var(--color-ink)" : "white",
          borderTop: submitted ? "1px solid var(--color-line)" : "none",
        }}
      >
        {submitted ? (
          <><Edit3 className="w-3.5 h-3.5" /> Edit this report</>
        ) : (
          <><Edit3 className="w-3.5 h-3.5" /> Log this report <ArrowRight className="w-3.5 h-3.5" /></>
        )}
      </Link>
    </div>
  );
}

function PlaceholderCard({
  icon, title, tagline,
}: { icon: React.ReactNode; title: string; tagline: string }) {
  return (
    <div
      className="rounded-2xl mb-3 px-4 py-3.5"
      style={{
        background: "white",
        border: "1.5px dashed var(--color-line)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#F1F5F9", color: "var(--color-muted)" }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="inline-flex items-center gap-1.5 font-extrabold text-[10px] uppercase mb-0.5"
            style={{ color: "var(--color-muted)", letterSpacing: "0.14em" }}
          >
            <Sparkles className="w-3 h-3" />
            Coming soon
          </div>
          <div className="font-black text-[15px]" style={{ color: "var(--color-muted)", letterSpacing: "-0.015em" }}>
            {title}
          </div>
          <div className="font-bold text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
            {tagline}
          </div>
        </div>
      </div>
    </div>
  );
}

function YesterdayLine({ r, goal }: { r: DailyReport; goal: number }) {
  const conv = r.acquired > 0 ? Math.round((r.opened_same_day / r.acquired) * 100) : 0;
  const hitGoal = r.total_opened >= goal;
  return (
    <p
      className="font-bold text-[14px]"
      style={{ color: "var(--color-ink)", lineHeight: 1.55, letterSpacing: "-0.005em" }}
    >
      <b className="num">{r.total_opened}</b> opened · <b className="num">{conv}%</b> same-day conversion
      {hitGoal && " · goal hit"}
    </p>
  );
}

function Pill({ icon, tone, children }: { icon: React.ReactNode; tone: "green" | "gold"; children: React.ReactNode }) {
  const style =
    tone === "green"
      ? { background: "#ECFDF5", color: "var(--color-funded)" }
      : { background: "rgba(255,200,0,0.16)", color: "#92400E" };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-extrabold text-[11px]"
      style={{ ...style, letterSpacing: "0.01em" }}
    >
      {icon}
      {children}
    </span>
  );
}
