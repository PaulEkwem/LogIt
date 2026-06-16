"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X, MapPin, Calendar, Users, ArrowRight } from "lucide-react";

export type EventRow = {
  id: string; name: string; location: string;
  start_date: string; end_date: string;
  status: "upcoming" | "active" | "closed";
  total_acquired: number; participants: number;
};

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDateShort(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function CampaignManagement({ events }: { events: EventRow[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [evName, setEvName] = useState("");
  const [evLocation, setEvLocation] = useState("");
  const [evStart, setEvStart] = useState(new Date().toISOString().slice(0, 10));
  const [evEnd, setEvEnd] = useState(new Date().toISOString().slice(0, 10));
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
      else {
        setShowCreate(false); setEvName(""); setEvLocation("");
        router.refresh();
      }
    } catch { setCreateError("Couldn't reach the server."); }
    finally { setCreating(false); }
  }

  return (
    <>
      {!showCreate && (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full rounded-xl py-3 font-extrabold text-[13px] flex items-center justify-center gap-2"
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

          <Field label="Campaign name">
            <input
              value={evName} onChange={(e) => setEvName(e.target.value)}
              placeholder="e.g. Yaba cluster marketing"
              className="w-full rounded-lg px-3 py-2.5 font-bold text-[14px] outline-none"
              style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
            />
          </Field>
          <Field label="Location">
            <input
              value={evLocation} onChange={(e) => setEvLocation(e.target.value)}
              placeholder="e.g. Yaba Tech Hub"
              className="w-full rounded-lg px-3 py-2.5 font-bold text-[14px] outline-none"
              style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Field label="Start">
              <input type="date" value={evStart} onChange={(e) => setEvStart(e.target.value)} className="w-full rounded-lg px-3 py-2.5 font-bold text-[13px] outline-none num" style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }} />
            </Field>
            <Field label="End">
              <input type="date" value={evEnd} onChange={(e) => setEvEnd(e.target.value)} className="w-full rounded-lg px-3 py-2.5 font-bold text-[13px] outline-none num" style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }} />
            </Field>
          </div>

          {createError && <div className="text-center mt-2 text-[12px] font-bold" style={{ color: "#DC2626" }}>{createError}</div>}

          <button
            onClick={createCampaign} disabled={creating}
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

      <div className="mt-2 flex flex-col gap-2">
        {events.map((ev) => <EventCard key={ev.id} event={ev} fmtDateShort={fmtDateShort} />)}
      </div>
    </>
  );
}

function EventCard({ event, fmtDateShort }: { event: EventRow; fmtDateShort: (iso: string) => string }) {
  const isActive = event.status === "active";
  const dateLabel = event.start_date === event.end_date
    ? fmtDateShort(event.start_date)
    : `${fmtDateShort(event.start_date)} – ${fmtDateShort(event.end_date)}`;
  return (
    <Link
      href={`/admin/events/${event.id}`}
      className="block rounded-2xl p-3.5 transition-transform active:scale-[0.995]"
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2.5 first:mt-0">
      <div className="font-extrabold text-[10px] uppercase mb-1" style={{ color: "var(--color-muted)", letterSpacing: "0.12em" }}>{label}</div>
      {children}
    </div>
  );
}
