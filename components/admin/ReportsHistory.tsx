"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Banknote, Sun, Moon, Search } from "lucide-react";

export type DayRow = {
  date: string;
  label: string;
  isToday: boolean;
  acquisition: { filed: number; total: number; acquired: number; opened: number };
  midday:      { filed: number; total: number; net: number; download_href: string };
  eod:         { filed: number; total: number; net: number; download_href: string };
};

function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs < 1) return abs.toFixed(2);
  if (abs < 10) return abs.toFixed(1);
  return abs.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function ReportsHistory({
  defaultFrom, defaultTo, days,
}: {
  defaultFrom: string;
  defaultTo: string;
  days: DayRow[];
}) {
  const router = useRouter();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  function applyRange() {
    if (!from || !to) return;
    router.push(`/admin/reports?from=${from}&to=${to}`);
  }

  return (
    <>
      {/* Date range picker */}
      <div className="rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
        <Field label="From">
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg px-3 py-2.5 font-bold text-[13px] outline-none num" style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }} />
        </Field>
        <Field label="To">
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg px-3 py-2.5 font-bold text-[13px] outline-none num" style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }} />
        </Field>
        <button onClick={applyRange} className="rounded-lg px-4 py-2.5 font-extrabold text-[13px] text-white inline-flex items-center gap-2" style={{ background: "var(--color-ink)" }}>
          <Search className="w-4 h-4" /> Apply
        </button>
      </div>

      {/* Day list */}
      {days.length === 0 && (
        <div className="text-center text-[13px] font-bold py-12" style={{ color: "var(--color-muted)" }}>
          No days in range.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {days.map((d) => <DayCard key={d.date} day={d} />)}
      </div>
    </>
  );
}

function DayCard({ day }: { day: DayRow }) {
  const acqPct = day.acquisition.total > 0 ? Math.min(100, Math.round((day.acquisition.filed / day.acquisition.total) * 100)) : 0;
  return (
    <div className="rounded-2xl p-4" style={{ background: "white", border: day.isToday ? "1.5px solid var(--color-brand-red)" : "1.5px solid var(--color-line)" }}>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="font-black text-[14px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>{day.label}</div>
          {day.isToday && (
            <span className="font-black text-[9px] rounded-md px-1.5 py-0.5 text-white" style={{ background: "var(--color-brand-red)", letterSpacing: "0.08em" }}>TODAY</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Tile
          icon={<Banknote className="w-4 h-4" />}
          label="Acquisition"
          primary={`${day.acquisition.filed}/${day.acquisition.total} filed`}
          secondary={day.acquisition.filed > 0 ? `${day.acquisition.opened} opened · ${day.acquisition.acquired} acquired` : "—"}
          pct={acqPct}
          downloadHref={null}
        />
        <Tile
          icon={<Sun className="w-4 h-4" />}
          label="Retention 12pm"
          primary={`${day.midday.filed}/${day.midday.total} filed`}
          secondary={day.midday.filed > 0 ? `Net ${day.midday.net < 0 ? "−" : "+"}₦${fmtMoney(day.midday.net)}M` : "—"}
          pct={day.midday.total > 0 ? Math.min(100, Math.round((day.midday.filed / day.midday.total) * 100)) : 0}
          downloadHref={day.midday.filed > 0 ? day.midday.download_href : null}
        />
        <Tile
          icon={<Moon className="w-4 h-4" />}
          label="Retention 5pm"
          primary={`${day.eod.filed}/${day.eod.total} filed`}
          secondary={day.eod.filed > 0 ? `Net ${day.eod.net < 0 ? "−" : "+"}₦${fmtMoney(day.eod.net)}M` : "—"}
          pct={day.eod.total > 0 ? Math.min(100, Math.round((day.eod.filed / day.eod.total) * 100)) : 0}
          downloadHref={day.eod.filed > 0 ? day.eod.download_href : null}
        />
      </div>
    </div>
  );
}

function Tile({
  icon, label, primary, secondary, pct, downloadHref,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary: string;
  pct: number;
  downloadHref: string | null;
}) {
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--color-bg)" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "white", color: "var(--color-ink)" }}>
          {icon}
        </div>
        <div className="font-extrabold text-[11px] uppercase" style={{ color: "var(--color-muted)", letterSpacing: "0.1em" }}>
          {label}
        </div>
      </div>
      <div className="font-black text-[14px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>
        {primary}
      </div>
      <div className="font-bold text-[11px] mt-0.5" style={{ color: "var(--color-body)" }}>
        {secondary}
      </div>
      <div className="mt-2 w-full h-1 rounded-full overflow-hidden" style={{ background: "#EEF2F7" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #16A34A, #22C55E)" }} />
      </div>
      {downloadHref && (
        <a href={downloadHref} target="_blank" rel="noopener" className="mt-2.5 w-full rounded-lg px-2.5 py-1.5 font-extrabold text-[11px] inline-flex items-center justify-center gap-1.5 text-white" style={{ background: "var(--color-ink)" }}>
          <Download className="w-3 h-3" /> PDF
        </a>
      )}
    </div>
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
