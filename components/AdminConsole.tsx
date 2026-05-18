"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, LogOut, Send, UserPlus, Pencil, CheckCircle2 } from "lucide-react";

type AdminRow = {
  id: string;
  full_name: string;
  am_code: string;
  initials: string;
  color: string;
  daily_goal: number;
  submitted: boolean;
  opened: number | null;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtToday() {
  const d = new Date();
  return `${d.toLocaleDateString(undefined, { weekday: "long" })}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function AdminConsole({
  divisionName, pcName, pcCode, rows, submittedCount, totalAcquired, totalOpened,
}: {
  divisionName: string;
  pcName: string;
  pcCode: string;
  rows: AdminRow[];
  submittedCount: number;
  totalAcquired: number;
  totalOpened: number;
}) {
  const router = useRouter();
  const [sent, setSent] = useState(false);

  const fillPct = rows.length > 0 ? Math.min(100, Math.round((submittedCount / rows.length) * 100)) : 0;
  const pendingCount = rows.length - submittedCount;

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function sendReport() {
    // TODO: server action to generate PDF + open email composer (mailto fallback)
    setSent(true);
  }

  return (
    <>
      <header
        className="sticky top-0 z-50 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, #1F2937, #0F172A)",
          padding: "14px 20px 18px",
        }}
      >
        <div>
          <div className="font-black text-[22px] text-white" style={{ letterSpacing: "-0.035em" }}>
            Log<span style={{ color: "var(--color-brand-gold)" }}>It</span>
          </div>
          <div className="mt-1">
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-black text-[10px]"
              style={{
                background: "rgba(255,200,0,0.16)",
                color: "var(--color-brand-gold)",
                letterSpacing: "0.12em",
              }}
            >
              <Shield className="w-3.5 h-3.5" /> ADMIN
            </span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="font-extrabold text-[12px] inline-flex items-center gap-1.5 rounded-lg px-3 py-2"
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1.5px solid rgba(255,255,255,0.15)",
            color: "white",
          }}
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </header>

      <main className="px-4 pt-5 pb-20">
        {/* Hero */}
        <div className="px-2 pt-9 flex flex-col">
          <div
            className="text-center font-extrabold text-[11px] uppercase"
            style={{ color: "var(--color-muted)", letterSpacing: "0.2em" }}
          >
            Admin · {pcName} · {fmtToday()}
          </div>
          <div className="flex items-baseline justify-center gap-1.5 mt-7">
            <span className="num" style={{ fontSize: 108, lineHeight: 0.9, letterSpacing: "-0.07em", color: "var(--color-ink)" }}>
              {submittedCount}
            </span>
            <span className="font-extrabold" style={{ fontSize: 38, color: "var(--color-muted)", letterSpacing: "-0.04em" }}>/</span>
            <span className="num" style={{ fontSize: 38, color: "var(--color-muted)", fontWeight: 800 }}>{rows.length}</span>
          </div>
          <div className="mt-7 w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#EEF2F7" }}>
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${fillPct}%`, background: "linear-gradient(90deg, #16A34A, #22C55E)" }}
            />
          </div>
          <div className="text-center mt-4 text-[15px] font-bold" style={{ color: "var(--color-body)" }}>
            Reports submitted today.
          </div>
        </div>

        <div
          className="text-center font-bold text-[13px] mt-6 px-4 leading-snug"
          style={{ color: "var(--color-body)", letterSpacing: "-0.005em" }}
        >
          Team has acquired <b className="num text-(--color-ink) font-black">{totalAcquired} prospects</b> and opened{" "}
          <b className="num text-(--color-ink) font-black">{totalOpened} accounts</b> so far.
          {pendingCount > 0 && <> <b className="num text-(--color-ink) font-black">{pendingCount}</b> AM{pendingCount === 1 ? "" : "s"} still need to log.</>}
        </div>

        {/* AM list */}
        <Section label="Account Managers">
          {rows.map((row, i) => (
            <AmRow key={row.id} row={row} first={i === 0} />
          ))}
        </Section>

        <div className="mx-2 mt-8 pt-5.5 flex flex-col gap-2.5" style={{ borderTop: "1px solid var(--color-line)", paddingTop: 22 }}>
          <button
            onClick={sendReport}
            disabled={sent}
            className="w-full rounded-2xl py-4 text-[15px] font-black flex items-center justify-center gap-2 text-white disabled:opacity-50"
            style={{ background: "var(--color-brand-red)", padding: 16, letterSpacing: "-0.01em" }}
          >
            <Send className="w-[18px] h-[18px]" /> Send today&apos;s report
          </button>
          {sent && (
            <div
              className="rounded-2xl p-3.5 flex items-center gap-3"
              style={{ background: "#ECFDF5", border: "1.5px solid var(--color-funded)" }}
            >
              <CheckCircle2 className="w-6 h-6" style={{ color: "var(--color-funded)" }} />
              <div>
                <div className="font-black text-[14px]" style={{ color: "var(--color-funded)" }}>Email composed with PDF attached</div>
                <div className="font-bold text-[12px] mt-0.5" style={{ color: "var(--color-body)" }}>Review and send to your division head</div>
              </div>
            </div>
          )}
          <button
            className="w-full rounded-2xl py-3.5 text-[14px] font-extrabold flex items-center justify-center gap-2"
            style={{
              background: "white",
              border: "1.5px solid var(--color-line)",
              color: "var(--color-ink)",
              padding: 13,
            }}
          >
            <UserPlus className="w-4 h-4" /> Add Account Manager
          </button>
        </div>
      </main>
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

function AmRow({ row, first }: { row: AdminRow; first: boolean }) {
  return (
    <div
      className="grid items-center gap-3 py-3.5"
      style={{
        gridTemplateColumns: "8px 30px 1fr auto auto",
        borderTop: first ? "none" : "1px solid #F1F5F9",
      }}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{
          background: row.submitted ? "var(--color-funded)" : "transparent",
          border: row.submitted ? "none" : "1.5px solid var(--color-pending)",
        }}
      />
      <div
        className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-white font-extrabold"
        style={{ background: row.color, fontSize: 11, letterSpacing: "-0.01em" }}
      >
        {row.initials}
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-[14px] truncate" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>
          {row.full_name}
        </div>
        <div className="font-bold text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
          Code {row.am_code} · Goal {row.daily_goal}
        </div>
      </div>
      <div
        className="num text-[18px] text-right min-w-[22px]"
        style={{
          color: row.submitted ? "var(--color-ink)" : "var(--color-muted)",
          fontWeight: row.submitted ? 900 : 700,
          letterSpacing: "-0.03em",
        }}
      >
        {row.submitted ? row.opened : "—"}
      </div>
      <button
        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
        style={{ background: "#F1F5F9", color: "var(--color-ink)" }}
        aria-label="Edit"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
