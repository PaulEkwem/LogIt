import { CheckCircle2, Circle } from "lucide-react";

export type TeamEntry = {
  pc_id: string;
  pc_name: string;
  pc_code: string;
  filed: boolean;
  pledges: number;
  inflow: number;
  outflow: number;
  net: number;
  filled_by_name: string | null;
  filled_by_initials: string | null;
  filled_by_color: string | null;
  submitted_at: string | null;
};

const FLAT_THRESHOLD_M = 100;

function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs < 1) return abs.toFixed(2);
  if (abs < 10) return abs.toFixed(1);
  return abs.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function netColor(n: number): string {
  if (n < 0) return "#DC2626";
  if (n < FLAT_THRESHOLD_M) return "var(--color-pending)";
  return "#16A34A";
}

export function RetentionLive({ entries }: { entries: TeamEntry[] }) {
  const filed = entries.filter((e) => e.filed);
  const notFiled = entries.filter((e) => !e.filed);

  const totals = filed.reduce(
    (acc, e) => ({
      pledges: acc.pledges + e.pledges,
      inflow:  acc.inflow + e.inflow,
      outflow: acc.outflow + e.outflow,
      net:     acc.net + e.net,
    }),
    { pledges: 0, inflow: 0, outflow: 0, net: 0 },
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Running totals — inflow vs outflow, net */}
      <div
        className="rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
        style={{ background: "white", border: "1.5px solid var(--color-line)" }}
      >
        <Totals label="Pledges"  value={totals.pledges} suffix="M" />
        <Totals label="Inflow"   value={totals.inflow}  suffix="M" color="#16A34A" />
        <Totals label="Outflow"  value={totals.outflow} suffix="M" color="#DC2626" />
        <Totals label="Net"      value={totals.net}     suffix="M" color={netColor(totals.net)} signed primary />
      </div>

      {/* Filled list */}
      <section>
        <SectionTitle>Filed · {filed.length}</SectionTitle>
        {filed.length === 0 ? (
          <EmptyHint>No team has filed yet.</EmptyHint>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
            {filed
              .sort((a, b) => (b.submitted_at ?? "").localeCompare(a.submitted_at ?? ""))
              .map((e, i) => (
                <div
                  key={e.pc_id}
                  className="grid items-center gap-3 px-3 py-2.5"
                  style={{
                    gridTemplateColumns: "auto 1fr auto auto auto",
                    borderTop: i === 0 ? "none" : "1px solid #F1F5F9",
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-funded)" }} />
                  <div className="min-w-0">
                    <div className="font-extrabold text-[13px] truncate" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>
                      {e.pc_name}
                      <span className="font-bold text-[10px] ml-1.5" style={{ color: "var(--color-muted)", letterSpacing: "0.06em" }}>
                        {e.pc_code}
                      </span>
                    </div>
                    {e.filled_by_name && (
                      <div className="flex items-center gap-1.5 mt-0.5 font-bold text-[10px]" style={{ color: "var(--color-muted)" }}>
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-white font-extrabold" style={{ background: e.filled_by_color ?? "#94A3B8", fontSize: 7 }}>
                          {e.filled_by_initials}
                        </span>
                        {e.filled_by_name}
                        {e.submitted_at && <> · {new Date(e.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="num font-black text-[11px]" style={{ color: "#16A34A" }}>
                      +₦{fmtMoney(e.inflow)}M
                    </div>
                    <div className="num font-bold text-[10px] mt-0.5" style={{ color: "#DC2626" }}>
                      −₦{fmtMoney(e.outflow)}M
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="font-extrabold text-[10px] uppercase" style={{ color: "var(--color-muted)", letterSpacing: "0.06em" }}>Net</div>
                    <div className="num font-black text-[14px]" style={{ color: netColor(e.net) }}>
                      {e.net < 0 ? "−" : "+"}₦{fmtMoney(e.net)}M
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Not filled list */}
      <section>
        <SectionTitle>Not filed yet · {notFiled.length}</SectionTitle>
        {notFiled.length === 0 ? (
          <EmptyHint>Every team is in.</EmptyHint>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {notFiled
              .sort((a, b) => a.pc_name.localeCompare(b.pc_name))
              .map((e) => (
                <div
                  key={e.pc_id}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5"
                  style={{ background: "white", border: "1.5px solid var(--color-pending)" }}
                >
                  <Circle className="w-2.5 h-2.5" style={{ color: "var(--color-pending)" }} strokeWidth={2.5} />
                  <span className="font-extrabold text-[12px]" style={{ color: "var(--color-ink)" }}>
                    {e.pc_name}
                  </span>
                  <span className="font-bold text-[10px]" style={{ color: "var(--color-muted)" }}>
                    {e.pc_code}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Totals({
  label, value, suffix, primary = false, color, signed = false,
}: {
  label: string;
  value: number;
  suffix?: string;
  primary?: boolean;
  color?: string;
  signed?: boolean;
}) {
  return (
    <div>
      <div className="font-extrabold text-[10px] uppercase mb-1" style={{ color: "var(--color-muted)", letterSpacing: "0.12em" }}>{label}</div>
      <div className="num font-black" style={{ fontSize: primary ? 28 : 22, color: color ?? "var(--color-ink)", letterSpacing: "-0.03em", lineHeight: 1 }}>
        {signed && value > 0 ? "+" : signed && value < 0 ? "−" : ""}₦{fmtMoney(value)}{suffix && <span className="text-[14px] ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-extrabold text-[11px] uppercase mb-2" style={{ color: "var(--color-muted)", letterSpacing: "0.14em" }}>
      {children}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl px-4 py-3 text-[12px] font-bold" style={{ background: "white", border: "1.5px dashed var(--color-line)", color: "var(--color-muted)" }}>
      {children}
    </div>
  );
}
