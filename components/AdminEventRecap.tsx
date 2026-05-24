"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, MapPin, Calendar, Users, Send, FileDown, Lock } from "lucide-react";
import { ACCOUNT_TYPES, type Event } from "@/lib/types";

type AmRow = {
  id: string;
  full_name: string;
  initials: string;
  color: string;
  am_code: string;
  acquired: number;
  opened: number;
  types: { t1: number; t3: number; gt: number; sm: number; sk: number };
};

type PcRow = {
  pc_id: string;
  pc_name: string;
  pc_code: string;
  acquired: number;
  opened: number;
  ams: AmRow[];
};

type Totals = {
  acquired: number;
  opened: number;
  participants: number;
  conversion: number;
  types: { t1: number; t3: number; gt: number; sm: number; sk: number };
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtShort(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function AdminEventRecap({
  event, divisionName, byPc, totals,
}: {
  event: Event;
  divisionName: string;
  byPc: PcRow[];
  totals: Totals;
}) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const [sent, setSent] = useState(false);

  const dateLabel = event.start_date === event.end_date
    ? fmtShort(event.start_date)
    : `${fmtShort(event.start_date)} – ${fmtShort(event.end_date)}`;
  const isActive = event.status === "active";
  const typeTotal = totals.types.t1 + totals.types.t3 + totals.types.gt + totals.types.sm + totals.types.sk;

  async function closeCampaign() {
    setClosing(true);
    await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    setClosing(false);
    router.refresh();
  }

  return (
    <>
      <header
        className="sticky top-0 z-50 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, #1F2937, #0F172A)",
          padding: "14px 18px 18px",
        }}
      >
        <Link
          href="/admin"
          aria-label="Back to admin"
          className="inline-flex items-center gap-1.5 font-extrabold text-[12px] text-white px-2 py-1.5 rounded-md"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Admin
        </Link>
        <div className="font-black text-[16px] text-white" style={{ letterSpacing: "-0.02em" }}>
          Campaign recap
        </div>
        <div className="w-[68px]" />
      </header>

      <main className="px-4 pt-5 pb-20">
        {/* Hero */}
        <div className="px-2 pt-4">
          <div
            className="font-extrabold text-[10px] uppercase mb-1"
            style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}
          >
            {isActive ? "Active · " : "Closed · "}{divisionName}
          </div>
          <div className="font-black text-[26px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em", lineHeight: 1.2 }}>
            {event.name}
          </div>
          <div className="flex items-center gap-4 mt-2 text-[13px] font-bold" style={{ color: "var(--color-body)" }}>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> {event.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> {dateLabel}
            </span>
          </div>
        </div>

        {/* Big totals */}
        <div className="px-2 mt-7 flex items-baseline justify-center gap-1.5">
          <span className="num" style={{ fontSize: 96, lineHeight: 0.9, letterSpacing: "-0.07em", color: "var(--color-ink)" }}>
            {totals.opened}
          </span>
          <span className="font-extrabold" style={{ fontSize: 34, color: "var(--color-muted)", letterSpacing: "-0.04em" }}>
            / {totals.acquired}
          </span>
        </div>
        <div className="text-center mt-3 font-bold text-[13px]" style={{ color: "var(--color-body)" }}>
          opened from acquired · <b className="num" style={{ color: "var(--color-ink)" }}>{totals.conversion}%</b> conversion
        </div>
        <div className="text-center mt-1 font-bold text-[12px]" style={{ color: "var(--color-muted)" }}>
          <Users className="inline w-3 h-3 mr-1" />
          <b className="num">{totals.participants}</b> participating AM{totals.participants === 1 ? "" : "s"} across <b className="num">{byPc.length}</b> PC{byPc.length === 1 ? "" : "s"}
        </div>

        {/* By type */}
        {typeTotal > 0 && (
          <div
            className="mx-2 mt-8 pt-5"
            style={{ borderTop: "1px solid var(--color-line)" }}
          >
            <div
              className="font-extrabold text-[11px] uppercase mb-3"
              style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}
            >
              By account type
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ACCOUNT_TYPES.map((t) => {
                const v = totals.types[t.key as keyof typeof totals.types];
                return (
                  <span
                    key={t.key}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-extrabold text-[12px]"
                    style={{
                      background: v > 0 ? `var(--color-${t.key}bg)` : "var(--color-bg)",
                      color: v > 0 ? `var(--color-${t.key})` : "var(--color-muted)",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    <span className="num">{v}</span> {t.code}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* By PC */}
        <div
          className="mx-2 mt-8 pt-5"
          style={{ borderTop: "1px solid var(--color-line)" }}
        >
          <div
            className="font-extrabold text-[11px] uppercase mb-3"
            style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}
          >
            By PC
          </div>
          {byPc.length === 0 && (
            <div className="text-[13px] font-bold" style={{ color: "var(--color-muted)" }}>
              No submissions yet.
            </div>
          )}
          {byPc.map((pc) => {
            const pcConv = pc.acquired > 0 ? Math.round((pc.opened / pc.acquired) * 100) : 0;
            return (
              <div
                key={pc.pc_id}
                className="rounded-2xl p-4 mb-3"
                style={{ background: "white", border: "1.5px solid var(--color-line)" }}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <div>
                    <div className="font-black text-[15px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.015em" }}>
                      {pc.pc_name}
                    </div>
                    <div className="font-bold text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                      PC {pc.pc_code} · {pc.ams.length} AM{pc.ams.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num" style={{ fontSize: 22, color: "var(--color-ink)", letterSpacing: "-0.03em", lineHeight: 1 }}>
                      {pc.opened}<span style={{ color: "var(--color-muted)", fontWeight: 800, fontSize: 13 }}> / {pc.acquired}</span>
                    </div>
                    <div className="font-bold text-[10px] mt-1" style={{ color: "var(--color-muted)" }}>
                      {pcConv}% conv
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2" style={{ borderTop: "1px solid #F1F5F9" }}>
                  {pc.ams.map((am, i) => (
                    <div
                      key={am.id}
                      className="grid items-center gap-3 py-2"
                      style={{
                        gridTemplateColumns: "28px 1fr auto",
                        borderTop: i === 0 ? "none" : "1px solid #F1F5F9",
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white font-extrabold"
                        style={{ background: am.color, fontSize: 10 }}
                      >
                        {am.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-[13px] truncate" style={{ color: "var(--color-ink)" }}>
                          {am.full_name}
                        </div>
                        <div className="font-bold text-[11px]" style={{ color: "var(--color-muted)" }}>
                          Code {am.am_code}
                        </div>
                      </div>
                      <div className="num text-right text-[16px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.02em" }}>
                        {am.opened}<span style={{ color: "var(--color-muted)", fontWeight: 800, fontSize: 11 }}> / {am.acquired}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mx-2 mt-8 pt-5 flex flex-col gap-2.5" style={{ borderTop: "1px solid var(--color-line)" }}>
          {isActive && (
            <button
              onClick={closeCampaign}
              disabled={closing}
              className="w-full rounded-2xl py-3.5 font-black text-[14px] flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "#FEE2E2", color: "var(--color-brand-red)" }}
            >
              <Lock className="w-4 h-4" /> {closing ? "Closing…" : "Close campaign"}
            </button>
          )}
          <button
            disabled
            className="w-full rounded-2xl py-3.5 font-extrabold text-[13px] flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
            style={{ background: "white", border: "1.5px solid var(--color-line)", color: "var(--color-body)" }}
          >
            <FileDown className="w-4 h-4" /> Export PDF
            <span className="font-bold text-[10px] ml-1" style={{ color: "var(--color-muted)" }}>(soon)</span>
          </button>
          <button
            onClick={() => setSent(true)}
            disabled={sent}
            className="w-full rounded-2xl py-3.5 font-black text-[14px] flex items-center justify-center gap-2 text-white disabled:opacity-50"
            style={{ background: "var(--color-ink)" }}
          >
            <Send className="w-4 h-4" /> Send recap to division head
          </button>
          {sent && (
            <div
              className="rounded-2xl p-3 text-center font-bold text-[12px]"
              style={{ background: "#ECFDF5", color: "var(--color-funded-d)", border: "1.5px solid var(--color-funded)" }}
            >
              Email composed with recap attached. Review and send.
            </div>
          )}
        </div>
      </main>
    </>
  );
}
