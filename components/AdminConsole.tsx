"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, LogOut, UserPlus, Pencil, MapPin, Calendar, Plus, X, Users, ArrowRight, Download, Lock, Unlock, CheckCircle2, ShieldCheck } from "lucide-react";

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

export type WindowState = {
  opened_at: string | null;
  closed_at: string | null;
  filed: number;
  total: number;
};

export type WindowsState = {
  acquisition: WindowState;
  retentionMidday: WindowState;
  retentionEod: WindowState;
};

type EventRow = {
  id: string; name: string; location: string;
  start_date: string; end_date: string;
  status: "upcoming" | "active" | "closed";
  total_acquired: number; participants: number;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtToday() {
  const d = new Date();
  return `${d.toLocaleDateString(undefined, { weekday: "long" })}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const FLAT_THRESHOLD_M = 100;
function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs < 1) return abs.toFixed(2);
  if (abs < 10) return abs.toFixed(1);
  return abs.toLocaleString(undefined, { maximumFractionDigits: 1 });
}
function netStatus(n: number): { emoji: string; color: string; label: string } {
  if (n < 0) return { emoji: "📉", color: "#DC2626", label: "Negative" };
  if (n < FLAT_THRESHOLD_M) return { emoji: "😐", color: "var(--color-pending)", label: "Flat" };
  return { emoji: "🚀", color: "#16A34A", label: "Positive" };
}

export function AdminConsole({
  divisionName, pcGroups, submittedCount, totalCount, totalAcquired, totalOpened, events,
  windows, retentionMiddayRows, retentionEodRows, retentionMiddayTotals, retentionEodTotals,
}: {
  divisionName: string;
  pcGroups: PcGroup[];
  submittedCount: number;
  totalCount: number;
  totalAcquired: number;
  totalOpened: number;
  events: EventRow[];
  windows: WindowsState;
  retentionMiddayRows: RetentionRow[];
  retentionEodRows: RetentionRow[];
  retentionMiddayTotals: RetentionTotals;
  retentionEodTotals: RetentionTotals;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [evName, setEvName] = useState("");
  const [evLocation, setEvLocation] = useState("");
  const [evStart, setEvStart] = useState(new Date().toISOString().slice(0, 10));
  const [evEnd, setEvEnd] = useState(new Date().toISOString().slice(0, 10));
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [openPcs, setOpenPcs] = useState<Record<string, boolean>>({});

  async function createCampaign() {
    if (!evName.trim() || !evLocation.trim()) { setCreateError("Name and location required."); return; }
    setCreating(true); setCreateError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: evName.trim(), location: evLocation.trim(), start_date: evStart, end_date: evEnd }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error ?? "Couldn't create."); }
      else { setShowCreate(false); setEvName(""); setEvLocation(""); router.refresh(); }
    } catch { setCreateError("Couldn't reach the server."); }
    finally { setCreating(false); }
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/"); router.refresh();
  }

  return (
    <>
      <header
        className="sticky top-0 z-50 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #1F2937, #0F172A)", padding: "14px 20px 18px" }}
      >
        <div>
          <div className="font-black text-[22px] text-white" style={{ letterSpacing: "-0.035em" }}>
            Log<span style={{ color: "var(--color-brand-gold)" }}>It</span>
          </div>
          <div className="mt-1">
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-black text-[10px]"
              style={{ background: "rgba(255,200,0,0.16)", color: "var(--color-brand-gold)", letterSpacing: "0.12em" }}
            >
              <Shield className="w-3.5 h-3.5" /> ADMIN
            </span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="font-extrabold text-[12px] inline-flex items-center gap-1.5 rounded-lg px-3 py-2"
          style={{ background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.15)", color: "white" }}
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </header>

      <main className="px-4 pt-5 pb-20">
        {/* Hero — division-wide summary */}
        <div className="px-2 pt-7 flex flex-col">
          <div className="text-center font-extrabold text-[11px] uppercase" style={{ color: "var(--color-muted)", letterSpacing: "0.2em" }}>
            {divisionName} · {fmtToday()}
          </div>
          <div className="text-center font-bold text-[13px] mt-3 px-4 leading-snug" style={{ color: "var(--color-body)" }}>
            Acquisition: <b className="num text-(--color-ink) font-black">{submittedCount}</b>/{totalCount} filed ·{" "}
            <b className="num text-(--color-ink) font-black">{totalAcquired}</b> acquired ·{" "}
            <b className="num text-(--color-ink) font-black">{totalOpened}</b> opened
          </div>
        </div>

        {/* Daily report windows */}
        <Section label="Today's report windows">
          <WindowTile
            label="Customer acquisition"
            sublabel="One filing per AM, throughout the day"
            reportType="acquisition"
            slot="single"
            state={windows.acquisition}
            downloadHref={null}
            onChange={() => router.refresh()}
          />
          <WindowTile
            label="Retention · 12pm"
            sublabel="Midday snapshot — one per team"
            reportType="retention"
            slot="midday"
            state={windows.retentionMidday}
            downloadHref="/admin/retention/export/midday"
            onChange={() => router.refresh()}
          />
          <WindowTile
            label="Retention · 5pm"
            sublabel="End of day snapshot — one per team"
            reportType="retention"
            slot="eod"
            state={windows.retentionEod}
            downloadHref="/admin/retention/export/eod"
            onChange={() => router.refresh()}
          />
        </Section>

        {/* Retention details — Midday */}
        {(windows.retentionMidday.opened_at || retentionMiddayRows.some((r) => r.filed)) && (
          <Section label={`Retention 12pm · ${windows.retentionMidday.filed}/${windows.retentionMidday.total} filed`}>
            <RetentionTable rows={retentionMiddayRows} totals={retentionMiddayTotals} />
          </Section>
        )}

        {/* Retention details — EOD */}
        {(windows.retentionEod.opened_at || retentionEodRows.some((r) => r.filed)) && (
          <Section label={`Retention 5pm · ${windows.retentionEod.filed}/${windows.retentionEod.total} filed`}>
            <RetentionTable rows={retentionEodRows} totals={retentionEodTotals} />
          </Section>
        )}

        {/* AMs by PC */}
        <Section label={`Account Managers · ${totalCount}`}>
          {pcGroups.map((g) => {
            const open = openPcs[g.pc_id] !== false;
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
                    <span className="font-extrabold text-[10px] rounded-md px-1.5 py-0.5" style={{ background: "#F1F5F9", color: "var(--color-muted)", letterSpacing: "0.06em" }}>
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
                <input value={evName} onChange={(e) => setEvName(e.target.value)} placeholder="e.g. Yaba cluster marketing" className="w-full rounded-lg px-3 py-2.5 font-bold text-[14px] outline-none" style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }} />
              </FormField>
              <FormField label="Location">
                <input value={evLocation} onChange={(e) => setEvLocation(e.target.value)} placeholder="e.g. Yaba Tech Hub" className="w-full rounded-lg px-3 py-2.5 font-bold text-[14px] outline-none" style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }} />
              </FormField>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <FormField label="Start"><input type="date" value={evStart} onChange={(e) => setEvStart(e.target.value)} className="w-full rounded-lg px-3 py-2.5 font-bold text-[13px] outline-none num" style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }} /></FormField>
                <FormField label="End"><input type="date" value={evEnd} onChange={(e) => setEvEnd(e.target.value)} className="w-full rounded-lg px-3 py-2.5 font-bold text-[13px] outline-none num" style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }} /></FormField>
              </div>

              {createError && <div className="text-center mt-2 text-[12px] font-bold" style={{ color: "#DC2626" }}>{createError}</div>}

              <button onClick={createCampaign} disabled={creating} className="w-full mt-4 rounded-xl py-3 font-black text-[14px] flex items-center justify-center gap-2 text-white disabled:opacity-40" style={{ background: "var(--color-brand-red)" }}>
                <Plus className="w-4 h-4" /> {creating ? "Creating…" : "Create and broadcast"}
              </button>
            </div>
          )}

          {events.length === 0 && !showCreate && (
            <div className="text-center mt-4 text-[12px] font-bold" style={{ color: "var(--color-muted)" }}>No campaigns yet.</div>
          )}

          {events.map((ev) => <EventCard key={ev.id} event={ev} />)}
        </Section>

        <div className="mx-2 mt-8 pt-5.5" style={{ borderTop: "1px solid var(--color-line)", paddingTop: 22 }}>
          <button className="w-full rounded-2xl py-3.5 text-[14px] font-extrabold flex items-center justify-center gap-2" style={{ background: "white", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}>
            <UserPlus className="w-4 h-4" /> Add Account Manager
          </button>
        </div>
      </main>
    </>
  );
}

function WindowTile({
  label, sublabel, reportType, slot, state, downloadHref, onChange,
}: {
  label: string;
  sublabel: string;
  reportType: "acquisition" | "retention";
  slot: "single" | "midday" | "eod";
  state: WindowState;
  downloadHref: string | null;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const opened = !!state.opened_at;
  const closed = !!state.closed_at;
  const live = opened && !closed;
  const filledPct = state.total > 0 ? Math.min(100, Math.round((state.filed / state.total) * 100)) : 0;

  async function toggle(action: "open" | "close") {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/window", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, report_type: reportType, slot }),
      });
      const data = await res.json();
      if (res.ok) {
        onChange();
      } else {
        alert(data.error ?? "Couldn't update window.");
      }
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = !opened ? "Not opened" : closed ? "Closed" : "Live";
  const statusColor = !opened ? "var(--color-muted)" : closed ? "var(--color-muted)" : "var(--color-funded)";
  const statusBg    = !opened ? "#F1F5F9" : closed ? "#F1F5F9" : "#ECFDF5";

  return (
    <div className="rounded-2xl p-3.5 mt-2" style={{ background: "white", border: live ? "1.5px solid var(--color-funded)" : "1.5px solid var(--color-line)" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-black text-[14px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.015em" }}>
            {label}
          </div>
          <div className="font-bold text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
            {sublabel}
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-black text-[10px] uppercase whitespace-nowrap"
          style={{ background: statusBg, color: statusColor, letterSpacing: "0.08em" }}
        >
          {live && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-funded)" }} />}
          {statusLabel}
        </span>
      </div>

      {opened && (
        <>
          <div className="mt-3 w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#EEF2F7" }}>
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${filledPct}%`, background: "linear-gradient(90deg, #16A34A, #22C55E)" }} />
          </div>
          <div className="mt-1.5 font-bold text-[11px]" style={{ color: "var(--color-body)" }}>
            <b className="num">{state.filed}</b>/<b className="num">{state.total}</b> filed
            {closed && state.filed >= state.total && <> · auto-closed at <b className="num">{new Date(state.closed_at!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b></>}
            {closed && state.filed < state.total && <> · closed early</>}
          </div>
        </>
      )}

      <div className="flex gap-2 mt-3 flex-wrap">
        {!opened && (
          <button
            onClick={() => toggle("open")}
            disabled={busy}
            className="rounded-lg px-3 py-2 font-extrabold text-[12px] inline-flex items-center gap-1.5 text-white disabled:opacity-40"
            style={{ background: "var(--color-brand-red)" }}
          >
            <Unlock className="w-3.5 h-3.5" /> Open
          </button>
        )}
        {live && (
          <button
            onClick={() => toggle("close")}
            disabled={busy}
            className="rounded-lg px-3 py-2 font-extrabold text-[12px] inline-flex items-center gap-1.5 disabled:opacity-40"
            style={{ background: "white", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
          >
            <Lock className="w-3.5 h-3.5" /> Close early
          </button>
        )}
        {closed && (
          <button
            onClick={() => toggle("open")}
            disabled={busy}
            className="rounded-lg px-3 py-2 font-extrabold text-[12px] inline-flex items-center gap-1.5 disabled:opacity-40"
            style={{ background: "white", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
          >
            <Unlock className="w-3.5 h-3.5" /> Re-open
          </button>
        )}
        {downloadHref && state.filed > 0 && (
          <a
            href={downloadHref}
            target="_blank"
            rel="noopener"
            className="rounded-lg px-3 py-2 font-extrabold text-[12px] inline-flex items-center gap-1.5"
            style={{ background: "var(--color-ink)", color: "white" }}
          >
            <Download className="w-3.5 h-3.5" /> Download PDF
          </a>
        )}
      </div>
    </div>
  );
}

function RetentionTable({ rows, totals }: { rows: RetentionRow[]; totals: RetentionTotals }) {
  const filedCount = rows.filter((r) => r.filed).length;
  return (
    <div className="rounded-2xl mt-2 overflow-hidden" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
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

      {rows.map((r, i) => <RetentionRowEl key={r.pc_id} row={r} first={i === 0} />)}

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

function RetentionRowEl({ row, first }: { row: RetentionRow; first: boolean }) {
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

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mx-2 mt-8 pt-5.5" style={{ borderTop: "1px solid var(--color-line)", paddingTop: 22 }}>
      <div className="font-extrabold text-[11px] uppercase mb-1.5" style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}>
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
      <div className="font-extrabold text-[10px] uppercase mb-1" style={{ color: "var(--color-muted)", letterSpacing: "0.12em" }}>
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
      style={{ background: "white", border: isActive ? "1.5px solid var(--color-brand-red)" : "1.5px solid var(--color-line)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isActive ? (
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-black text-[9px] uppercase" style={{ background: "#FEE2E2", color: "var(--color-brand-red)", letterSpacing: "0.08em" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-brand-red)" }} />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-black text-[9px] uppercase" style={{ background: "#F1F5F9", color: "var(--color-muted)", letterSpacing: "0.08em" }}>Closed</span>
            )}
          </div>
          <div className="font-black text-[14px] truncate" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>{event.name}</div>
          <div className="font-bold text-[11px] mt-0.5 flex items-center gap-2.5" style={{ color: "var(--color-muted)" }}>
            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>
            <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{dateLabel}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="num text-[20px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.03em" }}>{event.total_acquired}</div>
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
      style={{ gridTemplateColumns: "8px 30px 1fr auto auto", borderTop: first ? "none" : "1px solid #F1F5F9" }}
    >
      <div className="w-2 h-2 rounded-full" style={{ background: row.submitted ? "var(--color-funded)" : "transparent", border: row.submitted ? "none" : "1.5px solid var(--color-pending)" }} />
      <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-white font-extrabold" style={{ background: row.color, fontSize: 11, letterSpacing: "-0.01em" }}>
        {row.initials}
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-[14px] truncate" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>{row.full_name}</div>
        <div className="font-bold text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
          Code {row.am_code} · Goal {row.daily_goal}
          {row.team_label ? <> · <span style={{ color: "var(--color-brand-red)" }}>{row.team_label}</span></> : null}
        </div>
      </div>
      <div
        className="num text-[18px] text-right min-w-[22px]"
        style={{ color: row.submitted ? "var(--color-ink)" : "var(--color-muted)", fontWeight: row.submitted ? 900 : 700, letterSpacing: "-0.03em" }}
      >
        {row.submitted ? row.opened : "—"}
      </div>
      <button className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ background: "#F1F5F9", color: "var(--color-ink)" }} aria-label="Edit">
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Unused but kept to avoid breaking imports — remove next time we touch this file.
void CheckCircle2;
