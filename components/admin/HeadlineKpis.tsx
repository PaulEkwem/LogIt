function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs < 1) return abs.toFixed(2);
  if (abs < 10) return abs.toFixed(1);
  return abs.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function netStatusColor(n: number): string {
  if (n < 0) return "#DC2626";
  if (n < 100) return "var(--color-pending)";
  return "#16A34A";
}

export function HeadlineKpis({
  openedToday, netRetentionToday, retentionSlotLabel,
  amsFiled, amsTotal,
}: {
  openedToday: number;
  netRetentionToday: number | null;
  retentionSlotLabel: string | null;
  amsFiled: number;
  amsTotal: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Kpi label="Accounts opened today" value={openedToday} valueColor="var(--color-ink)" />
      <Kpi
        label={`Net retention${retentionSlotLabel ? ` · ${retentionSlotLabel}` : ""}`}
        value={netRetentionToday === null
          ? "—"
          : `${netRetentionToday < 0 ? "−" : netRetentionToday > 0 ? "+" : ""}₦${fmtMoney(netRetentionToday)}M`}
        valueColor={netRetentionToday === null ? "var(--color-muted)" : netStatusColor(netRetentionToday)}
      />
      <Kpi label="AMs filed acquisition" value={`${amsFiled}/${amsTotal}`} valueColor="var(--color-ink)" />
    </div>
  );
}

function Kpi({ label, value, valueColor }: { label: string; value: string | number; valueColor: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
      <div className="font-extrabold text-[10px] uppercase mb-1.5" style={{ color: "var(--color-muted)", letterSpacing: "0.14em" }}>
        {label}
      </div>
      <div className="num font-black" style={{ fontSize: 32, lineHeight: 1, letterSpacing: "-0.035em", color: valueColor }}>
        {value}
      </div>
    </div>
  );
}
