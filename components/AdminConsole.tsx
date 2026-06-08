"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, LogOut, Send, UserPlus, Pencil, CheckCircle2, MapPin, Calendar, Plus, X, Users, ArrowRight } from "lucide-react";

type AdminRow = {
  id: string;
  full_name: string;
  am_code: string;
  initials: string;
  color: string;
  daily_goal: number;
  team_label: string | null;
  submitted: boolean;
  opened: number | null;
};

export type PcGroup = {
  pc_id: string;
  pc_name: string;
  pc_code: string;
  rows: AdminRow[];
};

type EventRow = {
  id: string;
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  status: "upcoming" | "active" | "closed";
  total_acquired: number;
  participants: number;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtToday() {
  const d = new Date();
  return `${d.toLocaleDateString(undefined, { weekday: "long" })}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function AdminConsole({
  divisionName, pcGroups, submittedCount, totalCount, totalAcquired, totalOpened, events,
}: {
  divisionName: string;
  pcGroups: PcGroup[];
  submittedCount: number;
  totalCount: number;
  totalAcquired: number;
  totalOpened: number;
  events: EventRow[];
}) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [evName, setEvName] = useState("");
  const [evLocation, setEvLocation] = useState("");
  const [evStart, setEvStart] = useState(new Date().toISOString().slice(0, 10));
  const [evEnd, setEvEnd] = useState(new Date().toISOString().slice(0, 10));
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [openPcs, setOpenPcs] = useState<Record<string, boolean>>({});

  async function createCampaign() {
    if (!evName.trim() || !evLocation.trim()) {
      setCreateError("Name and location required.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: evName.trim(),
          location: evLocation.trim(),
          start_date: evStart,
          end_date: evEnd,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Couldn't create.");
      } else {
        setShowCreate(false);
        setEvName(""); setEvLocation("");
        router.refresh();
      }
    } catch {
      setCreateError("Couldn't reach the server.");
    } finally {
      setCreating(false);
    }
  }

  const fillPct = totalCount > 0 ? Math.min(100, Math.round((submittedCount / totalCount) * 100)) : 0;
  const pendingCount = totalCount - submittedCount;

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function sendReport() {
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
            {divisionName} · {fmtToday()}
          </div>
          <div className="flex items-baseline justify-center gap-1.5 mt-7">
            <span className="num" style={{ fontSize: 108, lineHeight: 0.9, letterSpacing: "-0.07em", color: "var(--color-ink)" }}>
              {submittedCount}
            </span>
            <span className="font-extrabold" style={{ fontSize: 38, color: "var(--color-muted)", letterSpacing: "-0.04em" }}>/</span>
            <span className="num" style={{ fontSize: 38, color: "var(--color-muted)", fontWeight: 800 }}>{totalCount}</span>
          </div>
          <div className="mt-7 w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#EEF2F7" }}>
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${fillPct}%`, background: "linear-gradient(90deg, #16A34A, #22C55E)" }}
            />
          </div>
          <div className="text-center mt-4 text-[15px] font-bold" style={{ color: "var(--color-body)" }}>
            Reports submitted across {pcGroups.length} {pcGroups.length === 1 ? "team" : "teams"}.
          </div>
        </div>

        <div
          className="text-center font-bold text-[13px] mt-6 px-4 leading-snug"
          style={{ color: "var(--color-body)", letterSpacing: "-0.005em" }}
        >
          Division has acquired <b className="num text-(--color-ink) font-black">{totalAcquired} prospects</b> and opened{" "}
          <b className="num text-(--color-ink) font-black">{totalOpened} accounts</b> today.
          {pendingCount > 0 && <> <b className="num text-(--color-ink) font-black">{pendingCount}</b> AM{pendingCount === 1 ? "" : "s"} still need to log.</>}
        </div>

        {/* AMs by PC */}
        <Section label={`Account Managers · ${totalCount}`}>
          {pcGroups.map((g) => {
            const open = openPcs[g.pc_id] !== false; // default open
            const subInPc = g.rows.filter((r) => r.submitted).length;
            return (
              <div key={g.pc_id} className="mt-3.5 first:mt-1">
                <button
                  onClick={() => setOpenPcs((s) => ({ ...s, [g.pc_id]: !open }))}
                  className="w-full flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-black text-[13px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>
                      {g.pc_name}
                    </span>
                    <span
                      className="font-extrabold text-[10px] rounded-md px-1.5 py-0.5"
                      style={{ background: "#F1F5F9", color: "var(--color-muted)", letterSpacing: "0.06em" }}
                    >
                      PC {g.pc_code}
                    </span>
                  </div>
                  <span className="font-extrabold text-[12px]" style={{ color: "var(--color-muted)" }}>
                    {subInPc}/{g.rows.length}
                  </span>
                </button>
                {open && (
                  <div className="rounded-2xl px-3" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
                    {g.rows.map((row, i) => (
                      <AmRow key={row.id} row={row} first={i === 0} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </Section>

        {/* Cluster campaigns */}
        <Section label="Cluster campaigns">
          {!showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full rounded-xl py-3 font-extrabold text-[13px] flex items-center justify-center gap-2 mt-1.5"
              style={{ background: "white", border: "1.5px dashed var(--color-line)", color: "var(--color-ink)" }}
            >
              <Plus className="w-4 h-4" /> Create new campaign
            </button>
          )}

          {showCreate && (
            <div className="rounded-2xl p-4 mt-2" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
              <div className="flex justify-between items-center mb-3">
                <div className="font-black text-[14px]" style={{ color: "var(--color-ink)" }}>New campaign</div>
                <button onClick={() => { setShowCreate(false); setCreateError(null); }} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#F1F5F9", color: "var(--color-ink)" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <FormField label="Campaign name">
                <input
                  value={evName}
                  onChange={(e) => setEvName(e.target.value)}
                  placeholder="e.g. Yaba cluster marketing"
                  className="w-full rounded-lg px-3 py-2.5 font-bold text-[14px] outline-none"
                  style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
                />
              </FormField>

              <FormField label="Location">
                <input
                  value={evLocation}
                  onChange={(e) => setEvLocation(e.target.value)}
                  placeholder="e.g. Yaba Tech Hub"
                  className="w-full rounded-lg px-3 py-2.5 font-bold text-[14px] outline-none"
                  style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <FormField label="Start">
                  <input
                    type="date"
                    value={evStart}
                    onChange={(e) => setEvStart(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 font-bold text-[13px] outline-none num"
                    style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
                  />
                </FormField>
                <FormField label="End">
                  <input
                    type="date"
                    value={evEnd}
                    onChange={(e) => setEvEnd(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 font-bold text-[13px] outline-none num"
                    style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
                  />
                </FormField>
              </div>

              {createError && (
                <div className="text-center mt-2 text-[12px] font-bold" style={{ color: "#DC2626" }}>
                  {createError}
                </div>
              )}

              <button
                onClick={createCampaign}
                disabled={creating}
                className="w-full mt-4 rounded-xl py-3 font-black text-[14px] flex items-center justify-center gap-2 text-white disabled:opacity-40"
                style={{ background: "var(--color-brand-red)" }}
              >
                <Plus className="w-4 h-4" /> {creating ? "Creating…" : "Create and broadcast"}
              </button>
              <div className="text-center mt-2 text-[11px] font-bold" style={{ color: "var(--color-muted)" }}>
                Banner appears live on every AM&apos;s home in the division.
              </div>
            </div>
          )}

          {events.length === 0 && !showCreate && (
            <div className="text-center mt-4 text-[12px] font-bold" style={{ color: "var(--color-muted)" }}>
              No campaigns yet.
            </div>
          )}

          {events.map((ev) => (
            <EventCard key={ev.id} event={ev} />
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

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDateShort(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2.5 first:mt-0">
      <div
        className="font-extrabold text-[10px] uppercase mb-1"
        style={{ color: "var(--color-muted)", letterSpacing: "0.12em" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function EventCard({ event }: { event: EventRow }) {
  const isActive = event.status === "active";
  const dateLabel = event.start_date === event.end_date
    ? fmtDateShort(event.start_date)
    : `${fmtDateShort(event.start_date)} – ${fmtDateShort(event.end_date)}`;

  return (
    <Link
      href={`/admin/events/${event.id}`}
      className="block rounded-2xl p-3.5 mt-2 transition-transform active:scale-[0.995]"
      style={{
        background: "white",
        border: isActive ? "1.5px solid var(--color-brand-red)" : "1.5px solid var(--color-line)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isActive ? (
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-black text-[9px] uppercase"
                style={{ background: "#FEE2E2", color: "var(--color-brand-red)", letterSpacing: "0.08em" }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-brand-red)" }} />
                Live
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-black text-[9px] uppercase"
                style={{ background: "#F1F5F9", color: "var(--color-muted)", letterSpacing: "0.08em" }}
              >
                Closed
              </span>
            )}
          </div>
          <div className="font-black text-[14px] truncate" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>
            {event.name}
          </div>
          <div className="font-bold text-[11px] mt-0.5 flex items-center gap-2.5" style={{ color: "var(--color-muted)" }}>
            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>
            <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{dateLabel}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="num text-[20px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.03em" }}>
            {event.total_acquired}
          </div>
          <div className="font-bold text-[10px]" style={{ color: "var(--color-muted)" }}>acquired</div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <div className="font-bold text-[11px] flex items-center gap-1 flex-1" style={{ color: "var(--color-muted)" }}>
          <Users className="w-3 h-3" />
          {event.participants} participant{event.participants === 1 ? "" : "s"}
        </div>
        <div className="font-extrabold text-[11px] inline-flex items-center gap-1" style={{ color: "var(--color-brand-red)" }}>
          Open recap <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </Link>
  );
}

function AmRow({ row, first }: { row: AdminRow; first: boolean }) {
  return (
    <div
      className="grid items-center gap-3 py-3"
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
          {row.team_label ? <> · <span style={{ color: "var(--color-brand-red)" }}>{row.team_label}</span></> : null}
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
