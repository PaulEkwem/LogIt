function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs < 1) return abs.toFixed(2);
  if (abs < 10) return abs.toFixed(1);
  return abs.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function netColor(n: number): string {
  if (n < 0) return "#DC2626";
  if (n < 100) return "var(--color-pending)";
  return "#16A34A";
}

/**
 * One-line summary for a CLOSED window — shows the final figures without the
 * full filled / not-filled lists.
 */
export function WindowSummaryRow({
  kind, opened, acquired, net, filed, total,
}: {
  kind: "acquisition" | "retention";
  opened?: number;
  acquired?: number;
  net?: number;
  filed: number;
  total: number;
}) {
  return (
    <div className="rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 flex-wrap" style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)" }}>
      <div className="font-bold text-[12px]" style={{ color: "var(--color-body)" }}>
        {kind === "acquisition" ? (
          <>
            <b className="num text-(--color-ink) font-black">{opened ?? 0}</b> opened from{" "}
            <b className="num text-(--color-ink) font-black">{acquired ?? 0}</b> acquired
          </>
        ) : (
          <>
            Net{" "}
            <b className="num font-black" style={{ color: netColor(net ?? 0) }}>
              {(net ?? 0) < 0 ? "−" : "+"}₦{fmtMoney(net ?? 0)}M
            </b>
          </>
        )}
      </div>
      <div className="font-extrabold text-[11px]" style={{ color: "var(--color-muted)", letterSpacing: "0.08em" }}>
        {filed}/{total} FILED
      </div>
    </div>
  );
}
