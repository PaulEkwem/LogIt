import { CheckCircle2, Circle } from "lucide-react";

export type AmEntry = {
  id: string;
  full_name: string;
  am_code: string;
  initials: string;
  color: string;
  pc_name: string;
  filed: boolean;
  acquired: number;
  opened: number;
  conv: number;
  submitted_at: string | null;
};

export function AcquisitionLive({ entries }: { entries: AmEntry[] }) {
  const filed = entries.filter((e) => e.filed);
  const notFiled = entries.filter((e) => !e.filed);

  const totalAcquired = filed.reduce((s, e) => s + e.acquired, 0);
  const totalOpened   = filed.reduce((s, e) => s + e.opened, 0);
  const overallConv   = totalAcquired > 0 ? Math.round((totalOpened / totalAcquired) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Running totals */}
      <div
        className="rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3"
        style={{ background: "white", border: "1.5px solid var(--color-line)" }}
      >
        <Totals label="Acquired so far" value={totalAcquired} />
        <Totals label="Opened so far"   value={totalOpened} primary />
        <Totals label="Conversion"      value={overallConv} suffix="%" />
      </div>

      {/* Filled list */}
      <section>
        <SectionTitle>Filed · {filed.length}</SectionTitle>
        {filed.length === 0 ? (
          <EmptyHint>No one has filed yet.</EmptyHint>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
            {filed
              .sort((a, b) => (b.submitted_at ?? "").localeCompare(a.submitted_at ?? ""))
              .map((e, i) => (
                <div
                  key={e.id}
                  className="grid items-center gap-3 px-3 py-2.5"
                  style={{
                    gridTemplateColumns: "auto 30px 1fr auto auto",
                    borderTop: i === 0 ? "none" : "1px solid #F1F5F9",
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" style={{ color: "var(--color-funded)" }} />
                  <Avatar color={e.color} initials={e.initials} size={30} />
                  <div className="min-w-0">
                    <div className="font-extrabold text-[13px] truncate" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>
                      {e.full_name}
                    </div>
                    <div className="font-bold text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                      {e.pc_name} · {e.am_code}
                      {e.submitted_at && <> · {new Date(e.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="num font-black text-[16px]" style={{ color: "var(--color-ink)" }}>{e.opened}</span>
                    <span className="font-bold text-[11px] ml-1" style={{ color: "var(--color-muted)" }}>opened</span>
                  </div>
                  <div className="font-extrabold text-[11px] num text-right min-w-[40px]" style={{ color: e.conv >= 50 ? "var(--color-funded)" : "var(--color-muted)" }}>
                    {e.acquired > 0 ? `${e.conv}%` : "—"}
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
          <EmptyHint>Everyone&apos;s in.</EmptyHint>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {notFiled
              .sort((a, b) => a.am_code.localeCompare(b.am_code))
              .map((e) => (
                <div
                  key={e.id}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5"
                  style={{ background: "white", border: "1.5px solid var(--color-pending)" }}
                >
                  <Circle className="w-2.5 h-2.5" style={{ color: "var(--color-pending)" }} strokeWidth={2.5} />
                  <span className="font-extrabold text-[12px]" style={{ color: "var(--color-ink)" }}>
                    {e.full_name.split(" ")[0]}
                  </span>
                  <span className="font-bold text-[10px]" style={{ color: "var(--color-muted)" }}>
                    {e.am_code}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Totals({ label, value, suffix, primary = false }: { label: string; value: number; suffix?: string; primary?: boolean }) {
  return (
    <div>
      <div className="font-extrabold text-[10px] uppercase mb-1" style={{ color: "var(--color-muted)", letterSpacing: "0.12em" }}>{label}</div>
      <div className="num font-black" style={{ fontSize: primary ? 28 : 22, color: "var(--color-ink)", letterSpacing: "-0.03em", lineHeight: 1 }}>
        {value}{suffix ?? ""}
      </div>
    </div>
  );
}

function Avatar({ color, initials, size }: { color: string; initials: string; size: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-extrabold flex-shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size > 32 ? 13 : 11, letterSpacing: "-0.01em" }}
    >
      {initials}
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
