import { CheckCircle2, Circle } from "lucide-react";

type Row = {
  id: string;
  full_name: string;
  am_code: string;
  initials: string;
  color: string;
  opened: number;
  acquired: number;
  conv: number;
  isMe: boolean;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtToday() {
  const d = new Date();
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function Leaderboard({
  rows,
  teamCount,
  teamTotalOpened,
  teamTotalAcquired,
  teamConv,
}: {
  rows: Row[];
  teamCount: number;
  teamTotalOpened: number;
  teamTotalAcquired: number;
  teamConv: number;
  /** Kept for backwards compatibility with the page; intentionally unused. */
  myRank?: number;
}) {
  const filedCount = rows.filter((r) => r.opened > 0 || r.acquired > 0).length;
  // Show teammates alphabetically — no ranking energy.
  const ordered = [...rows].sort((a, b) =>
    a.full_name.localeCompare(b.full_name, undefined, { sensitivity: "base" }),
  );

  return (
    <>
      <div className="px-2 pt-9 flex flex-col">
        <div
          className="text-center font-extrabold text-[11px] uppercase"
          style={{ color: "var(--color-muted)", letterSpacing: "0.2em" }}
        >
          Your team · {fmtToday()}
        </div>

        <div className="flex items-baseline justify-center gap-2 mt-7">
          <span className="num" style={{ fontSize: 88, lineHeight: 0.9, letterSpacing: "-0.07em", color: "var(--color-ink)" }}>
            {teamTotalOpened}
          </span>
          <span className="font-black" style={{ fontSize: 22, color: "var(--color-muted)", letterSpacing: "-0.03em" }}>
            opened
          </span>
        </div>

        <div className="text-center mt-4 text-[15px] font-bold" style={{ color: "var(--color-body)", letterSpacing: "-0.005em" }}>
          From <b className="num text-(--color-ink) font-black">{teamTotalAcquired} acquisitions</b> — a{" "}
          <b className="num text-(--color-ink) font-black">{teamConv}%</b> same-day conversion across the team.
        </div>
      </div>

      <Section label={`Teammates today · ${filedCount}/${teamCount} filed`}>
        <div className="rounded-2xl mt-2 overflow-hidden" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
          {ordered.map((r, i) => (
            <TeamRow key={r.id} row={r} first={i === 0} />
          ))}
        </div>
        <div className="text-center mt-3 text-[11px] font-bold" style={{ color: "var(--color-muted)" }}>
          Sorted alphabetically · we all win when the team wins.
        </div>
      </Section>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mx-2 mt-8 pt-5.5" style={{ borderTop: "1px solid var(--color-line)", paddingTop: 22 }}>
      <div
        className="font-extrabold text-[11px] uppercase mb-1.5"
        style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function TeamRow({ row, first }: { row: Row; first: boolean }) {
  const me = row.isMe;
  const filed = row.opened > 0 || row.acquired > 0;
  return (
    <div
      className="grid items-center gap-3 px-3 py-3"
      style={{
        gridTemplateColumns: "auto 30px 1fr auto auto",
        borderTop: first ? "none" : "1px solid #F1F5F9",
        background: me ? "linear-gradient(90deg, rgba(206,17,38,0.04), transparent 80%)" : undefined,
      }}
    >
      {filed ? (
        <CheckCircle2 className="w-4 h-4" style={{ color: "var(--color-funded)" }} />
      ) : (
        <Circle className="w-4 h-4" style={{ color: "var(--color-pending)" }} strokeWidth={2.25} />
      )}
      <Avatar color={row.color} initials={row.initials} size={30} />
      <div className="min-w-0">
        <div className="font-extrabold text-[14px] flex items-center gap-1.5" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>
          <span className="truncate">{row.full_name}</span>
          {me && (
            <span className="font-black text-[9px] rounded-md px-1.5 py-px text-white" style={{ background: "var(--color-brand-red)", letterSpacing: "0.06em" }}>
              YOU
            </span>
          )}
        </div>
        <div className="font-bold text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
          Code {row.am_code}
          {!filed && <> · <span style={{ color: "var(--color-pending)" }}>not filed yet</span></>}
        </div>
      </div>
      <div
        className="num text-[18px] text-right min-w-[28px]"
        style={{
          color: filed ? "var(--color-ink)" : "var(--color-muted)",
          fontWeight: filed ? 900 : 700,
          letterSpacing: "-0.03em",
        }}
      >
        {filed ? row.opened : "—"}
      </div>
      <div
        className="font-extrabold text-[11px] num text-right min-w-[32px]"
        style={{ color: row.conv >= 50 && filed ? "var(--color-funded)" : "var(--color-muted)" }}
      >
        {filed && row.acquired > 0 ? `${row.conv}%` : "—"}
      </div>
    </div>
  );
}

function Avatar({ color, initials, size }: { color: string; initials: string; size: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-extrabold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size > 32 ? 13 : 11,
        letterSpacing: "-0.01em",
      }}
    >
      {initials}
    </div>
  );
}
