"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export type Tab = "acquisition" | "retention";
export type Range = "today" | "yesterday" | "week" | "month" | "custom";

export function ReportsControls({
  tab, range, defaultFrom, defaultTo,
}: {
  tab: Tab;
  range: Range;
  defaultFrom: string;
  defaultTo: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  function go(nextTab: Tab, nextRange: Range, customFrom?: string, customTo?: string) {
    const params = new URLSearchParams();
    params.set("tab", nextTab);
    params.set("range", nextRange);
    if (nextRange === "custom" && customFrom && customTo) {
      params.set("from", customFrom);
      params.set("to", customTo);
    }
    router.push(`/admin/reports?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Tab toggle */}
      <div className="grid grid-cols-2 rounded-xl p-1 max-w-sm" style={{ background: "var(--color-line)" }}>
        <TabBtn label="Acquisition" active={tab === "acquisition"} onClick={() => go("acquisition", range, from, to)} />
        <TabBtn label="Retention"   active={tab === "retention"}   onClick={() => go("retention", range, from, to)} />
      </div>

      {/* Range picker */}
      <div className="grid grid-cols-5 rounded-xl p-1" style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)" }}>
        <RangeBtn label="Today"     active={range === "today"}     onClick={() => go(tab, "today")} />
        <RangeBtn label="Yesterday" active={range === "yesterday"} onClick={() => go(tab, "yesterday")} />
        <RangeBtn label="Week"      active={range === "week"}      onClick={() => go(tab, "week")} />
        <RangeBtn label="Month"     active={range === "month"}     onClick={() => go(tab, "month")} />
        <RangeBtn label="Custom"    active={range === "custom"}    onClick={() => go(tab, "custom", from, to)} />
      </div>

      {range === "custom" && (
        <div className="rounded-2xl p-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
          <Field label="From">
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg px-3 py-2 font-bold text-[13px] outline-none num" style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }} />
          </Field>
          <Field label="To">
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg px-3 py-2 font-bold text-[13px] outline-none num" style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }} />
          </Field>
          <button onClick={() => go(tab, "custom", from, to)} className="rounded-lg px-4 py-2 font-extrabold text-[13px] text-white inline-flex items-center gap-2 justify-center" style={{ background: "var(--color-ink)" }}>
            <Search className="w-4 h-4" /> Apply
          </button>
        </div>
      )}
    </div>
  );
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-center py-2 rounded-lg font-extrabold text-[13px] transition-colors"
      style={{
        background: active ? "white" : "transparent",
        color: active ? "var(--color-ink)" : "var(--color-muted)",
        boxShadow: active ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
        letterSpacing: "-0.005em",
      }}
    >
      {label}
    </button>
  );
}

function RangeBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-center py-1.5 px-1 rounded-lg font-extrabold text-[11px] transition-colors truncate"
      style={{
        background: active ? "var(--color-ink)" : "transparent",
        color: active ? "white" : "var(--color-body)",
        letterSpacing: "-0.005em",
      }}
    >
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-extrabold text-[10px] uppercase mb-1" style={{ color: "var(--color-muted)", letterSpacing: "0.12em" }}>{label}</div>
      {children}
    </div>
  );
}
