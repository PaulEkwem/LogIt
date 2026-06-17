"use client";

import { Plus } from "lucide-react";
import { useWindowAction } from "@/lib/useRequestWindow";
import { CountdownOverlay } from "./CountdownOverlay";

export type BarDatum = {
  label: string;
  value: number;
  color?: string;
  /**
   * When present, the bar at this position renders as a clickable
   * "+ Request" tile that opens the corresponding report window.
   */
  cta?: {
    reportType: "acquisition" | "retention";
    slot: "single" | "midday" | "eod";
    label?: string;     // e.g. "Request Retention 12pm"
  };
};

export type ValueFormat = "number" | "naira-millions";

function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs < 1) return abs.toFixed(2);
  if (abs < 10) return abs.toFixed(1);
  return abs.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatValue(n: number, kind: ValueFormat): string {
  if (kind === "naira-millions") return `${n < 0 ? "−" : "+"}₦${fmtMoney(n)}M`;
  return String(n);
}

export function BarChart({
  data,
  height = 200,
  signed = false,
  valueFormat = "number",
  baseColor = "var(--color-brand-red)",
  emptyHint = "No data in this range yet.",
}: {
  data: BarDatum[];
  height?: number;
  signed?: boolean;
  valueFormat?: ValueFormat;
  baseColor?: string;
  emptyHint?: string;
}) {
  const { phase, active, fire, finish } = useWindowAction();
  const busy = phase !== "idle";

  if (data.length === 0) {
    return (
      <div className="rounded-2xl px-4 py-10 text-center" style={{ background: "white", border: "1.5px dashed var(--color-line)" }}>
        <div className="font-bold text-[12px]" style={{ color: "var(--color-muted)" }}>{emptyHint}</div>
      </div>
    );
  }

  const fmt = (n: number) => formatValue(n, valueFormat);
  const dataCells = data.filter((d) => !d.cta);
  const max = Math.max(0, ...dataCells.map((d) => d.value));
  const min = signed ? Math.min(0, ...dataCells.map((d) => d.value)) : 0;
  const range = Math.max(1, max - min);
  const zeroPct = (max / range) * 100;

  async function requestWindow(cta: NonNullable<BarDatum["cta"]>) {
    await fire({
      variant: "request",
      reportType: cta.reportType,
      slot: cta.slot,
      label: cta.label ?? "Request",
    });
  }

  return (
    <div className="rounded-2xl p-3" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
      <div className="flex items-stretch gap-1.5" style={{ height }}>
        {data.map((d, i) => (
          <div key={`${d.label}-${i}`} className="flex-1 flex flex-col">
            {d.cta ? (
              <button
                onClick={() => requestWindow(d.cta!)}
                disabled={busy}
                className="flex-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.97] disabled:opacity-50"
                style={{
                  background: "rgba(206,17,38,0.06)",
                  border: "1.5px dashed var(--color-brand-red)",
                  color: "var(--color-brand-red)",
                  minHeight: 80,
                }}
                aria-label={d.cta.label ?? "Request"}
              >
                <Plus className="w-6 h-6" strokeWidth={2.5} />
                <span className="font-extrabold text-[10px] uppercase text-center px-1" style={{ letterSpacing: "0.08em", lineHeight: 1.2 }}>
                  {d.cta.label ?? "Request"}
                </span>
              </button>
            ) : (
              <BarCell value={d.value} max={max} min={min} range={range} signed={signed} zeroPct={zeroPct} color={d.color ?? baseColor} title={`${d.label}: ${fmt(d.value)}`} />
            )}
          </div>
        ))}
      </div>

      {phase === "counting" && active && (
        <CountdownOverlay variant={active.variant} label={active.label} onDone={finish} />
      )}

      {/* X-axis labels */}
      <div className="grid mt-2 gap-1.5" style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}>
        {data.map((d, i) => (
          <div key={`${d.label}-x-${i}`} className="text-center font-extrabold text-[10px] truncate" style={{ color: "var(--color-muted)", letterSpacing: "0.04em" }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function BarCell({
  value, max, min, range, signed, zeroPct, color, title,
}: {
  value: number;
  max: number;
  min: number;
  range: number;
  signed: boolean;
  zeroPct: number;
  color: string;
  title: string;
}) {
  void max; void min;
  if (!signed) {
    // Simple positive-only: bar grows from bottom
    const pct = (value / range) * 100;
    return (
      <div className="flex-1 flex flex-col justify-end" title={title}>
        <div
          className="rounded-md w-full"
          style={{
            height: `${Math.max(value === 0 ? 0 : 2, pct)}%`,
            background: color,
            opacity: value === 0 ? 0.15 : 1,
            minHeight: value === 0 ? 4 : undefined,
          }}
        />
      </div>
    );
  }
  // Signed: zero line splits column. Positive bar above, negative bar below.
  const isPositive = value >= 0;
  const positiveAreaPct = zeroPct;             // height available for negative bars (from zero line down)
  const negativeAreaPct = 100 - zeroPct;       // height available for positive bars (from zero line up)
  const barPct = (Math.abs(value) / range) * 100;
  return (
    <div className="flex-1 flex flex-col" title={title}>
      {/* Positive area (above zero) */}
      <div className="flex-grow flex flex-col justify-end" style={{ flexBasis: `${positiveAreaPct}%`, flexGrow: 0 }}>
        {isPositive && (
          <div
            className="rounded-t-md w-full"
            style={{
              height: `${(barPct / negativeAreaPct) * 100}%`,
              background: color,
              opacity: value === 0 ? 0.15 : 1,
              minHeight: value === 0 ? 0 : 2,
            }}
          />
        )}
      </div>
      {/* Zero line */}
      <div className="w-full" style={{ height: 1, background: "var(--color-line)" }} />
      {/* Negative area (below zero) */}
      <div className="flex-grow flex flex-col justify-start" style={{ flexBasis: `${negativeAreaPct}%`, flexGrow: 0 }}>
        {!isPositive && (
          <div
            className="rounded-b-md w-full"
            style={{
              height: `${(barPct / positiveAreaPct) * 100}%`,
              background: color,
              minHeight: 2,
            }}
          />
        )}
      </div>
    </div>
  );
}
