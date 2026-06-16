/**
 * Lightweight SVG bar chart. Renders one bar per data point with optional
 * signed support (bars can dip below a zero line for negative values).
 *
 * Server-renderable — no client state. Hover behaviour kept minimal via the
 * <title> child on each bar.
 */

export type BarDatum = {
  label: string;       // short label (e.g. "Mon" or "13 Jun")
  value: number;
  color?: string;      // optional per-bar colour override
};

export function BarChart({
  data,
  height = 180,
  signed = false,
  formatValue,
  baseColor = "var(--color-brand-red)",
  emptyHint = "No data in this range yet.",
}: {
  data: BarDatum[];
  height?: number;
  signed?: boolean;
  formatValue?: (n: number) => string;
  baseColor?: string;
  emptyHint?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl px-4 py-10 text-center" style={{ background: "white", border: "1.5px dashed var(--color-line)" }}>
        <div className="font-bold text-[12px]" style={{ color: "var(--color-muted)" }}>{emptyHint}</div>
      </div>
    );
  }

  const fmt = formatValue ?? ((n) => String(n));
  const max = Math.max(0, ...data.map((d) => d.value));
  const min = signed ? Math.min(0, ...data.map((d) => d.value)) : 0;
  const range = Math.max(1, max - min);

  // Geometry
  const padTop = 18;
  const padBottom = 26;
  const innerH = height - padTop - padBottom;
  const zeroY = padTop + (max / range) * innerH;

  const barCount = data.length;
  // Use a percent-based width so the chart fills its container responsively.
  const cellWidthPct = 100 / barCount;
  const barWidthPct = cellWidthPct * 0.6;

  return (
    <div className="rounded-2xl p-3" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
        {/* Zero line for signed charts */}
        {signed && (
          <line x1={0} y1={zeroY} x2={100} y2={zeroY} stroke="var(--color-line)" strokeWidth={0.2} />
        )}

        {/* Bars */}
        {data.map((d, i) => {
          const cellLeft = i * cellWidthPct;
          const barLeft = cellLeft + (cellWidthPct - barWidthPct) / 2;
          const valuePx = (Math.abs(d.value) / range) * innerH;
          const isNeg = d.value < 0;
          const barY = isNeg ? zeroY : zeroY - valuePx;
          const barHeight = Math.max(valuePx, d.value === 0 ? 0 : 0.6);
          const color = d.color ?? baseColor;
          return (
            <g key={`${d.label}-${i}`}>
              <rect
                x={barLeft}
                y={barY}
                width={barWidthPct}
                height={barHeight}
                rx={0.6}
                fill={color}
                opacity={d.value === 0 ? 0.18 : 1}
              >
                <title>{`${d.label}: ${fmt(d.value)}`}</title>
              </rect>
            </g>
          );
        })}
      </svg>

      {/* X-axis labels — HTML for crisper text than SVG <text> */}
      <div className="grid mt-1.5" style={{ gridTemplateColumns: `repeat(${barCount}, 1fr)` }}>
        {data.map((d, i) => (
          <div key={`${d.label}-x-${i}`} className="text-center font-extrabold text-[9px] truncate" style={{ color: "var(--color-muted)", letterSpacing: "0.04em" }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
