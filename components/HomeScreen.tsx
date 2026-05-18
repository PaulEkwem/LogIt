"use client";

import Link from "next/link";
import { Edit3, Check, Flame, Award } from "lucide-react";
import type { DailyReport } from "@/lib/types";

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
}: {
  amName: string;
  goal: number;
  today: DailyReport | null;
  yesterday: DailyReport | null;
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const submitted = today !== null;

  const heroVal = submitted ? today!.total_opened : 0;
  const fillPct = Math.min(100, Math.round((heroVal / goal) * 100));

  return (
    <>
      {/* Hero */}
      <div className="px-2 pt-9 flex flex-col">
        <div
          className="text-center font-extrabold text-[11px] uppercase"
          style={{ color: "var(--color-muted)", letterSpacing: "0.2em" }}
        >
          {fmtFullDate(todayIso)}
        </div>

        <div className="flex items-baseline justify-center gap-1.5 mt-7">
          <span
            className="num"
            style={{
              fontSize: 108,
              lineHeight: 0.9,
              letterSpacing: "-0.07em",
              color: submitted ? "var(--color-ink)" : "#CBD5E1",
            }}
          >
            {heroVal}
          </span>
          <span
            className="font-extrabold"
            style={{
              fontSize: 38,
              color: "var(--color-muted)",
              letterSpacing: "-0.04em",
            }}
          >
            /
          </span>
          <span
            className="num"
            style={{
              fontSize: 38,
              color: "var(--color-muted)",
              letterSpacing: "-0.02em",
              fontWeight: 800,
            }}
          >
            {goal}
          </span>
        </div>

        <div className="mt-7 w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#EEF2F7" }}>
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{
              width: `${fillPct}%`,
              background: "linear-gradient(90deg, #16A34A, #22C55E)",
            }}
          />
        </div>

        <div
          className="text-center mt-4 text-[15px] font-bold"
          style={{ color: "var(--color-body)", letterSpacing: "-0.005em" }}
        >
          {submitted ? (
            <>Logged at {new Date(today!.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.</>
          ) : (
            <>No report logged today.</>
          )}
        </div>

        <div className="mt-8">
          <Link
            href="/log"
            className="w-full rounded-2xl py-4.5 text-[16px] font-black flex items-center justify-center gap-2 text-white"
            style={{
              background: submitted ? "white" : "var(--color-brand-red)",
              color: submitted ? "var(--color-ink)" : "white",
              padding: "18px",
              border: submitted ? "1.5px solid var(--color-line)" : "none",
            }}
          >
            <Edit3 className="w-[18px] h-[18px]" />
            {submitted ? "Edit today's report" : "Log today's report"}
          </Link>
        </div>
      </div>

      {/* Detail */}
      {(submitted ? today : yesterday) && (
        <div
          className="mx-2 mt-11 pt-6"
          style={{ borderTop: "1px solid var(--color-line)" }}
        >
          <div
            className="font-extrabold text-[11px] uppercase mb-2.5"
            style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}
          >
            {submitted ? "Today" : "Yesterday"}
          </div>
          {submitted ? (
            <TodayDetail r={today!} goal={goal} />
          ) : (
            <YesterdayDetail r={yesterday!} goal={goal} />
          )}
        </div>
      )}

      {!submitted && !yesterday && (
        <div
          className="mx-2 mt-11 pt-6 text-[13px] font-bold"
          style={{ borderTop: "1px solid var(--color-line)", color: "var(--color-muted)" }}
        >
          No prior reports yet — your first submission starts the streak.
        </div>
      )}
    </>
  );
}

function TodayDetail({ r, goal }: { r: DailyReport; goal: number }) {
  const fromEarlier = Math.max(0, r.total_opened - r.opened_same_day);
  const conv = r.acquired > 0 ? Math.round((r.opened_same_day / r.acquired) * 100) : 0;
  const hitGoal = r.total_opened >= goal;
  return (
    <>
      <p
        className="font-bold text-[15px] mb-2"
        style={{ color: "var(--color-ink)", lineHeight: 1.55, letterSpacing: "-0.005em" }}
      >
        <b className="num">{r.total_opened}</b> opened from <b className="num">{r.acquired}</b> acquired —{" "}
        <b className="num">{r.opened_same_day}</b> from today&apos;s pipeline,{" "}
        <b className="num">{fromEarlier}</b> from earlier.
      </p>
      <div className="flex gap-1.5 flex-wrap mt-3">
        {hitGoal && (
          <Pill icon={<Check className="w-3.5 h-3.5" />} tone="green">
            Hit your goal
          </Pill>
        )}
        <Pill icon={<Flame className="w-3.5 h-3.5" />} tone="gold">
          Streak +1
        </Pill>
        {conv >= 50 && (
          <Pill icon={<Award className="w-3.5 h-3.5" />} tone="gold">
            Closer of the day
          </Pill>
        )}
      </div>
    </>
  );
}

function YesterdayDetail({ r, goal }: { r: DailyReport; goal: number }) {
  const conv = r.acquired > 0 ? Math.round((r.opened_same_day / r.acquired) * 100) : 0;
  const hitGoal = r.total_opened >= goal;
  return (
    <p
      className="font-bold text-[15px]"
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
