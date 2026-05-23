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

function ord(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

const podiumColors = [
  "linear-gradient(180deg, #FCD34D, #B8860B)",
  "linear-gradient(180deg, #CBD5E1, #64748B)",
  "linear-gradient(180deg, #DDB892, #8B5E3C)",
];
const podiumHeights = [84, 68, 52];

export function Leaderboard({
  rows,
  teamCount,
  teamTotalOpened,
  teamTotalAcquired,
  teamConv,
  myRank,
}: {
  rows: Row[];
  teamCount: number;
  teamTotalOpened: number;
  teamTotalAcquired: number;
  teamConv: number;
  myRank: number;
}) {
  // Top three for podium (visual order: 2nd, 1st, 3rd)
  const podiumOrder = [rows[1], rows[0], rows[2]].filter(Boolean);

  return (
    <>
      {/* Hero — your rank */}
      <div className="px-2 pt-9 flex flex-col">
        <div
          className="text-center font-extrabold text-[11px] uppercase"
          style={{ color: "var(--color-muted)", letterSpacing: "0.2em" }}
        >
          Leaderboard · {fmtToday()}
        </div>

        <div className="flex items-baseline justify-center gap-1 mt-7">
          <span className="num" style={{ fontSize: 108, lineHeight: 0.9, letterSpacing: "-0.07em", color: "var(--color-ink)" }}>
            {myRank || "—"}
          </span>
          <span className="font-black" style={{ fontSize: 36, color: "var(--color-ink)", letterSpacing: "-0.04em" }}>
            {myRank ? ord(myRank) : ""}
          </span>
        </div>
        <div className="text-center mt-4 text-[15px] font-bold" style={{ color: "var(--color-body)" }}>
          of {teamCount} in your team today.
        </div>
      </div>

      <div
        className="text-center font-bold text-[13px] mt-6 px-4 leading-snug"
        style={{ color: "var(--color-body)", letterSpacing: "-0.005em" }}
      >
        Team opened <b className="num text-(--color-ink) font-black">{teamTotalOpened} accounts</b> from{" "}
        <b className="num text-(--color-ink) font-black">{teamTotalAcquired} acquisitions</b> — a{" "}
        <b className="num text-(--color-ink) font-black">{teamConv}%</b> same-day conversion.
      </div>

      {/* Podium */}
      {podiumOrder.length >= 3 && (
        <Section label="Top three">
          <div className="grid grid-cols-3 gap-2 items-end mt-1">
            {podiumOrder.map((r, i) => {
              const rank = [2, 1, 3][i];
              return (
                <div key={r.id} className="flex flex-col items-center">
                  <Avatar color={r.color} initials={r.initials} size={36} />
                  <div
                    className="font-extrabold text-[11px] text-center mt-1.5 mb-1.5"
                    style={{ color: "var(--color-ink)", letterSpacing: "-0.005em", lineHeight: 1.2 }}
                  >
                    {r.full_name.split(" ")[0]}
                  </div>
                  <div
                    className="w-full rounded-t-xl flex flex-col items-center justify-center text-white py-2.5"
                    style={{
                      background: podiumColors[rank - 1],
                      height: podiumHeights[rank - 1],
                    }}
                  >
                    <div className="num" style={{ fontSize: 26, lineHeight: 1, letterSpacing: "-0.03em" }}>
                      {r.opened}
                    </div>
                    <div className="font-black text-[10px] mt-1 opacity-80" style={{ letterSpacing: "0.06em" }}>
                      {rank}
                      {ord(rank).toUpperCase()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Standings */}
      <Section label="Standings">
        {rows.map((r, idx) => (
          <Standing key={r.id} row={r} rank={idx + 1} />
        ))}
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

function Standing({ row, rank }: { row: Row; rank: number }) {
  const me = row.isMe;
  return (
    <div
      className="grid items-center gap-3 py-3.5"
      style={{
        gridTemplateColumns: "22px 30px 1fr auto auto",
        borderTop: "1px solid #F1F5F9",
        ...(me
          ? {
              background: "linear-gradient(90deg, rgba(206,17,38,0.05), transparent 80%)",
              marginInline: -8,
              padding: "14px 8px 14px 12px",
              borderLeft: "3px solid var(--color-brand-red)",
              borderTop: "1px solid transparent",
              borderRadius: 2,
            }
          : {}),
      }}
    >
      <div
        className="num text-center text-[13px]"
        style={{ color: me ? "var(--color-brand-red)" : "var(--color-muted)" }}
      >
        {rank}
      </div>
      <Avatar color={row.color} initials={row.initials} size={30} />
      <div className="min-w-0">
        <div
          className="font-extrabold text-[14px] flex items-center gap-1.5"
          style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}
        >
          <span className="truncate">{row.full_name}</span>
          {me && (
            <span
              className="font-black text-[9px] rounded-md px-1.5 py-px text-white"
              style={{ background: "var(--color-brand-red)", letterSpacing: "0.06em" }}
            >
              YOU
            </span>
          )}
        </div>
        <div
          className="font-bold text-[11px] mt-0.5"
          style={{ color: "var(--color-muted)" }}
        >
          Code {row.am_code}
        </div>
      </div>
      <div
        className="num text-[20px]"
        style={{ color: me ? "var(--color-brand-red)" : "var(--color-ink)", letterSpacing: "-0.03em" }}
      >
        {row.opened}
      </div>
      <div
        className="font-extrabold text-[11px] num text-right min-w-[32px]"
        style={{ color: row.conv >= 50 ? "var(--color-funded)" : "var(--color-muted)" }}
      >
        {row.acquired > 0 ? `${row.conv}%` : "—"}
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
