function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs < 1) return abs.toFixed(2);
  if (abs < 10) return abs.toFixed(1);
  return abs.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export type YesterdayData = {
  hadAnyData: boolean;
  amsFiled: number;
  amsTotal: number;
  opened: number;
  acquired: number;
  retentionTeamsFiled: number;
  retentionTeamsTotal: number;
  retentionNet: number | null;
  retentionSlotLabel: string | null;
  dateLabel: string;
};

export function YesterdayRecap({ data }: { data: YesterdayData }) {
  if (!data.hadAnyData) {
    return (
      <div className="rounded-2xl p-4" style={{ background: "white", border: "1.5px dashed var(--color-line)" }}>
        <div className="font-extrabold text-[10px] uppercase" style={{ color: "var(--color-muted)", letterSpacing: "0.14em" }}>
          Yesterday · {data.dateLabel}
        </div>
        <div className="font-bold text-[12px] mt-1" style={{ color: "var(--color-muted)" }}>
          No reports were filed yesterday.
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl p-4" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
      <div className="font-extrabold text-[10px] uppercase mb-2.5" style={{ color: "var(--color-muted)", letterSpacing: "0.14em" }}>
        Yesterday · {data.dateLabel}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Opened" value={data.opened} sub={`${data.amsFiled}/${data.amsTotal} AMs filed`} />
        <Stat label="Acquired" value={data.acquired} sub="across the division" />
        <Stat
          label={data.retentionSlotLabel ? `Net retention · ${data.retentionSlotLabel}` : "Net retention"}
          value={data.retentionNet === null
            ? "—"
            : `${data.retentionNet < 0 ? "−" : "+"}₦${fmtMoney(data.retentionNet)}M`}
          sub={`${data.retentionTeamsFiled}/${data.retentionTeamsTotal} teams filed`}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div>
      <div className="font-extrabold text-[10px] uppercase" style={{ color: "var(--color-muted)", letterSpacing: "0.1em" }}>
        {label}
      </div>
      <div className="num font-black mt-0.5" style={{ fontSize: 22, lineHeight: 1, letterSpacing: "-0.03em", color: "var(--color-ink)" }}>
        {value}
      </div>
      <div className="font-bold text-[11px] mt-1" style={{ color: "var(--color-muted)" }}>
        {sub}
      </div>
    </div>
  );
}
