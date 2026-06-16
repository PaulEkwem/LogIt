import { ShieldCheck } from "lucide-react";

export type RetentionRow =
  | { pc_id: string; pc_name: string; pc_code: string; filed: false }
  | {
      pc_id: string; pc_name: string; pc_code: string;
      filed: true;
      pledges: number; inflow: number; outflow: number; net: number;
      filled_by_name: string; filled_by_initials: string; filled_by_color: string;
      submitted_at: string;
    };

export type RetentionTotals = { pledges: number; inflow: number; outflow: number; net: number };

const FLAT_THRESHOLD_M = 100;

export function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs < 1) return abs.toFixed(2);
  if (abs < 10) return abs.toFixed(1);
  return abs.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function netStatus(n: number): { emoji: string; color: string; label: string } {
  if (n < 0) return { emoji: "📉", color: "#DC2626", label: "Negative" };
  if (n < FLAT_THRESHOLD_M) return { emoji: "😐", color: "var(--color-pending)", label: "Flat" };
  return { emoji: "🚀", color: "#16A34A", label: "Positive" };
}

export function RetentionTable({ rows, totals }: { rows: RetentionRow[]; totals: RetentionTotals }) {
  const filedCount = rows.filter((r) => r.filed).length;
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
      <div
        className="grid items-center gap-2 px-3 py-2 font-extrabold text-[10px] uppercase"
        style={{
          gridTemplateColumns: "1fr 60px 60px 60px 72px 24px",
          color: "var(--color-muted)", letterSpacing: "0.1em",
          background: "#F8FAFC", borderBottom: "1px solid var(--color-line)",
        }}
      >
        <span>Team</span>
        <span className="text-right">Pledges</span>
        <span className="text-right">Inflow</span>
        <span className="text-right">Outflow</span>
        <span className="text-right">Net</span>
        <span />
      </div>

      {rows.map((r, i) => <Row key={r.pc_id} row={r} first={i === 0} />)}

      {filedCount > 0 && (
        <div
          className="grid items-center gap-2 px-3 py-2.5 font-black"
          style={{
            gridTemplateColumns: "1fr 60px 60px 60px 72px 24px",
            background: "#F8FAFC", borderTop: "1px solid var(--color-line)",
          }}
        >
          <span className="text-[11px] uppercase" style={{ color: "var(--color-muted)", letterSpacing: "0.1em" }}>Division total</span>
          <span className="num text-right text-[12px]" style={{ color: "var(--color-ink)" }}>₦{fmtMoney(totals.pledges)}M</span>
          <span className="num text-right text-[12px]" style={{ color: "#16A34A" }}>₦{fmtMoney(totals.inflow)}M</span>
          <span className="num text-right text-[12px]" style={{ color: "#DC2626" }}>₦{fmtMoney(totals.outflow)}M</span>
          <span className="num text-right text-[12px]" style={{ color: netStatus(totals.net).color }}>
            {totals.net < 0 ? "−" : ""}₦{fmtMoney(totals.net)}M
          </span>
          <span className="text-[13px] text-right" aria-hidden>{netStatus(totals.net).emoji}</span>
        </div>
      )}
    </div>
  );
}

function Row({ row, first }: { row: RetentionRow; first: boolean }) {
  const filed = row.filed;
  const status = filed ? netStatus(row.net) : null;
  const time = filed
    ? new Date(row.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;
  return (
    <div
      className="grid items-center gap-2 px-3 py-2.5"
      style={{
        gridTemplateColumns: "1fr 60px 60px 60px 72px 24px",
        borderTop: first ? "none" : "1px solid #F1F5F9",
      }}
    >
      <div className="min-w-0">
        <div className="font-black text-[13px] truncate" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>
          {row.pc_name}
          <span className="font-extrabold text-[10px] ml-1.5" style={{ color: "var(--color-muted)", letterSpacing: "0.06em" }}>
            {row.pc_code}
          </span>
        </div>
        {filed ? (
          <div className="flex items-center gap-1.5 mt-0.5 font-bold text-[10px]" style={{ color: "var(--color-muted)" }}>
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-white font-extrabold"
              style={{ background: row.filled_by_color, fontSize: 7 }}
            >
              {row.filled_by_initials}
            </span>
            {row.filled_by_name} · {time}
          </div>
        ) : (
          <div className="font-bold text-[10px] mt-0.5" style={{ color: "var(--color-pending)" }}>Pending</div>
        )}
      </div>
      {filed ? (
        <>
          <span className="num text-right text-[12px] font-black" style={{ color: "var(--color-ink)" }}>₦{fmtMoney(row.pledges)}M</span>
          <span className="num text-right text-[12px] font-black" style={{ color: "#16A34A" }}>₦{fmtMoney(row.inflow)}M</span>
          <span className="num text-right text-[12px] font-black" style={{ color: "#DC2626" }}>₦{fmtMoney(row.outflow)}M</span>
          <span className="num text-right text-[12px] font-black" style={{ color: status!.color }}>
            {row.net < 0 ? "−" : ""}₦{fmtMoney(row.net)}M
          </span>
          <span className="text-[14px] text-right" title={status!.label} aria-hidden>{status!.emoji}</span>
        </>
      ) : (
        <>
          <span className="text-right text-[12px]" style={{ color: "var(--color-muted)" }}>—</span>
          <span className="text-right text-[12px]" style={{ color: "var(--color-muted)" }}>—</span>
          <span className="text-right text-[12px]" style={{ color: "var(--color-muted)" }}>—</span>
          <span className="text-right text-[12px]" style={{ color: "var(--color-muted)" }}>—</span>
          <ShieldCheck className="w-3.5 h-3.5 ml-auto" style={{ color: "var(--color-muted)" }} />
        </>
      )}
    </div>
  );
}
