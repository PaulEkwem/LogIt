"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MapPin, ArrowRight } from "lucide-react";
import type { DailyReport } from "@/lib/types";
import { ACCOUNT_TYPES } from "@/lib/types";

export type CampaignSummary = {
  event_id: string;
  name: string;
  location: string;
  date: string;
  status: string;
  acquired: number;
  opened: number;
};

type Range = "today" | "week" | "month" | "custom";
type Metric = "opened" | "acquired";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtShort(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeekIso() {
  const d = new Date();
  const dow = d.getDay(); // 0 Sun .. 6 Sat
  const offset = dow === 0 ? 6 : dow - 1; // Monday start
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function startOfMonthIso() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export function ReportScreen({
  history, goal, myCampaigns,
}: {
  history: DailyReport[];
  goal: number;
  myCampaigns: CampaignSummary[];
}) {
  const [range, setRange] = useState<Range>("today");
  const [metric, setMetric] = useState<Metric>("opened");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const data = useMemo(() => {
    const today = todayIso();
    switch (range) {
      case "today":
        return history.filter((d) => d.report_date === today);
      case "week":
        return history.filter((d) => d.report_date >= startOfWeekIso() && d.report_date <= today);
      case "month":
        return history.filter((d) => d.report_date >= startOfMonthIso() && d.report_date <= today);
      case "custom":
        if (!customFrom || !customTo) return [];
        const from = customFrom <= customTo ? customFrom : customTo;
        const to = customFrom <= customTo ? customTo : customFrom;
        return history.filter((d) => d.report_date >= from && d.report_date <= to);
    }
  }, [range, history, customFrom, customTo]);

  const sum = data.reduce((s, d) => s + (metric === "opened" ? d.total_opened : d.acquired), 0);
  const altSum = data.reduce((s, d) => s + (metric === "opened" ? d.acquired : d.total_opened), 0);
  const conv = metric === "opened"
    ? (altSum > 0 ? Math.round((sum / altSum) * 100) : 0)
    : (sum > 0 ? Math.round((altSum / sum) * 100) : 0);
  const hits = data.filter((d) => d.total_opened >= goal).length;

  const dateLabel =
    range === "today" ? new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : range === "week" ? `This week · ${fmtShort(startOfWeekIso())} – ${fmtShort(todayIso())}`
    : range === "month" ? `This month · ${fmtShort(startOfMonthIso())} – ${fmtShort(todayIso())}`
    : data.length === 0 ? "Pick a date range"
    : `${fmtShort(data[0].report_date)} – ${fmtShort(data[data.length - 1].report_date)} · ${data.length} day${data.length === 1 ? "" : "s"}`;

  const statusWord = metric === "opened" ? "accounts opened" : "prospects acquired";
  const statusSentence = data.length === 0
    ? "No data in this range."
    : range === "today"
    ? `${statusWord} today.`
    : `${statusWord} over ${data.length} working day${data.length === 1 ? "" : "s"}.`;

  const showChart = data.length > 1;

  // Type breakdown (works for both metrics — types only meaningful for opened, but we keep visible)
  const typeTotals = useMemo(() => {
    const totals: Record<string, number> = { t1: 0, t3: 0, gt: 0, sm: 0, sk: 0 };
    data.forEach((d) => {
      totals.t1 += d.type_t1; totals.t3 += d.type_t3; totals.gt += d.type_gt;
      totals.sm += d.type_sm; totals.sk += d.type_sk;
    });
    return totals;
  }, [data]);
  const typeMax = Object.values(typeTotals).reduce((s, v) => s + v, 0) || 1;

  return (
    <>
      <SegControl
        value={range}
        onChange={(v) => setRange(v as Range)}
        options={[
          { value: "today",  label: "Today" },
          { value: "week",   label: "Week" },
          { value: "month",  label: "Month" },
          { value: "custom", label: "Custom" },
        ]}
        cols={4}
      />
      {range === "custom" && (
        <div className="flex items-center justify-center gap-2.5 mt-3 px-2 font-bold text-[13px]" style={{ color: "var(--color-muted)" }}>
          <DateInput value={customFrom} onChange={setCustomFrom} />
          <span>to</span>
          <DateInput value={customTo} onChange={setCustomTo} />
        </div>
      )}
      <SegControl
        value={metric}
        onChange={(v) => setMetric(v as Metric)}
        options={[
          { value: "opened",   label: "Opened" },
          { value: "acquired", label: "Acquired" },
        ]}
        cols={2}
        className="mt-2"
      />

      {/* Hero */}
      <div className="px-2 pt-9 flex flex-col">
        <div
          className="text-center font-extrabold text-[11px] uppercase"
          style={{ color: "var(--color-muted)", letterSpacing: "0.2em" }}
        >
          {dateLabel}
        </div>
        <div className="flex items-baseline justify-center gap-1.5 mt-7">
          <span className="num" style={{ fontSize: 108, lineHeight: 0.9, letterSpacing: "-0.07em", color: "var(--color-ink)" }}>
            {sum}
          </span>
        </div>
        <div className="text-center mt-4 text-[15px] font-bold" style={{ color: "var(--color-body)" }}>
          {statusSentence}
        </div>
        {metric === "opened" && data.length > 1 && (
          <div className="flex justify-center mt-3.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-extrabold text-[11px]"
              style={{ background: "#ECFDF5", color: "var(--color-funded)" }}
            >
              Hit goal <b className="num">{hits} of {data.length}</b> days
            </span>
          </div>
        )}
      </div>

      <div
        className="text-center font-bold text-[13px] mt-6 px-4 leading-snug"
        style={{ color: "var(--color-body)", letterSpacing: "-0.005em" }}
      >
        {data.length > 0 && metric === "opened" && (
          <>From <b className="num text-(--color-ink) font-black">{altSum} acquisitions</b> — <b className="num text-(--color-ink) font-black">{conv}%</b> same-day conversion.</>
        )}
        {data.length > 0 && metric === "acquired" && (
          <>Of those, <b className="num text-(--color-ink) font-black">{altSum}</b> opened — <b className="num text-(--color-ink) font-black">{conv}%</b> same-day conversion.</>
        )}
      </div>

      {showChart && (
        <Section label="By day">
          <Chart data={data} metric={metric} goal={goal} />
        </Section>
      )}

      <Section label="By account type">
        <div className="mt-1.5">
          {[...ACCOUNT_TYPES].sort((a, b) => (typeTotals[b.key] ?? 0) - (typeTotals[a.key] ?? 0)).map((t, i) => {
            const count = typeTotals[t.key] ?? 0;
            const pct = typeMax > 0 ? Math.round((count / typeMax) * 100) : 0;
            return (
              <div key={t.key} className="py-3.5" style={i === 0 ? { paddingTop: 4 } : { borderTop: "1px solid #F1F5F9" }}>
                <div className="flex items-center gap-2.5 mb-2">
                  <span
                    className="inline-flex items-center justify-center font-black rounded-lg"
                    style={{
                      width: 28, height: 28, fontSize: 10, letterSpacing: "-0.02em",
                      background: `var(--color-${t.key}bg)`,
                      color: `var(--color-${t.key})`,
                    }}
                  >
                    {t.code}
                  </span>
                  <span className="font-extrabold text-[14px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.005em" }}>
                    {t.label}
                  </span>
                  <span className="ml-auto num text-[18px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.03em" }}>
                    {count}
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "#F1F5F9", marginLeft: 38 }}>
                  <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: `var(--color-${t.key})` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {myCampaigns.length > 0 && (
        <Section label="My campaigns">
          <div className="flex flex-col gap-2 mt-1.5">
            {myCampaigns.map((c) => (
              <Link
                key={c.event_id}
                href={`/event/${c.event_id}`}
                className="rounded-2xl p-3.5 flex items-center gap-3 transition-transform active:scale-[0.995]"
                style={{ background: "white", border: "1.5px solid var(--color-line)" }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: c.status === "active" ? "rgba(206,17,38,0.08)" : "#F1F5F9",
                    color: c.status === "active" ? "var(--color-brand-red)" : "var(--color-muted)",
                  }}
                >
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-[13px] truncate" style={{ color: "var(--color-ink)", letterSpacing: "-0.005em" }}>
                    {c.name}
                  </div>
                  <div className="font-bold text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                    {c.location} · {fmtShort(c.date)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="num text-[16px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {c.opened}<span style={{ color: "var(--color-muted)", fontWeight: 800, fontSize: 11 }}> / {c.acquired}</span>
                  </div>
                  <div className="font-bold text-[10px] mt-1" style={{ color: "var(--color-muted)" }}>opened</div>
                </div>
                <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-muted)" }} />
              </Link>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function SegControl({
  value, onChange, options, cols, className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  cols: number;
  className?: string;
}) {
  return (
    <div
      className={`grid gap-1 rounded-xl p-1 mx-2 ${className}`}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, background: "#F1F5F9" }}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="font-extrabold text-[13px] py-2.5 rounded-lg transition-all text-center"
            style={{
              color: active ? "var(--color-ink)" : "var(--color-body)",
              background: active ? "white" : "transparent",
              boxShadow: active ? "0 1px 2px rgba(15,23,42,0.08)" : "none",
              letterSpacing: "-0.005em",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="font-extrabold text-[13px] px-2.5 py-2 rounded-lg outline-none num"
      style={{
        background: "white",
        border: "1.5px solid var(--color-line)",
        color: "var(--color-ink)",
      }}
    />
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

function Chart({ data, metric, goal }: { data: DailyReport[]; metric: Metric; goal: number }) {
  const today = todayIso();
  const values = data.map((d) => (metric === "opened" ? d.total_opened : d.acquired));
  const max = Math.max(...values, 1);
  const showLabels = data.length <= 7;
  const showNumbers = data.length <= 10;

  return (
    <>
      <div className="flex items-end gap-1 min-h-[130px] pt-2 mt-1">
        {data.map((d, i) => {
          const value = values[i];
          const pct = (value / max) * 100;
          const isToday = d.report_date === today;
          const isHit = metric === "opened" && d.total_opened >= goal;
          const bg = isToday ? "var(--color-brand-red)" : isHit ? "var(--color-funded)" : "var(--color-ink)";
          const dow = new Date(d.report_date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });
          return (
            <div key={d.id} className="flex-1 flex flex-col items-center min-w-0">
              <div className="w-full flex items-end justify-center" style={{ height: 96 }}>
                <div
                  className="w-full rounded-t transition-[height] duration-500"
                  style={{
                    maxWidth: 28,
                    minHeight: 2,
                    height: `${pct}%`,
                    background: bg,
                  }}
                />
              </div>
              {showNumbers && (
                <div className="font-extrabold text-[11px] mt-1.5 num" style={{ color: "var(--color-ink)" }}>
                  {value}
                </div>
              )}
              {showLabels && (
                <div className="font-extrabold text-[10px] uppercase mt-0.5" style={{ color: "var(--color-muted)", letterSpacing: "0.04em" }}>
                  {dow.charAt(0)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!showLabels && (
        <div className="flex justify-between mt-2 px-1 font-extrabold text-[10px] uppercase" style={{ color: "var(--color-muted)", letterSpacing: "0.06em" }}>
          <span>{fmtShort(data[0].report_date)}</span>
          <span>{fmtShort(data[data.length - 1].report_date)}</span>
        </div>
      )}
    </>
  );
}
