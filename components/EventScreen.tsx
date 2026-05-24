"use client";

import { useState } from "react";
import { MapPin, Calendar, Plus, Edit3, Lock } from "lucide-react";
import { ACCOUNT_TYPES, type Event } from "@/lib/types";
import { EventTallyFlow } from "./EventTallyFlow";

type OwnReport = {
  acquired: number;
  total_opened: number;
  type_t1: number;
  type_t3: number;
  type_gt: number;
  type_sm: number;
  type_sk: number;
  submitted_at: string;
  edited_at: string | null;
} | null;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtShort(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function EventScreen({
  event, ownReport, canSubmit,
}: {
  event: Event;
  ownReport: OwnReport;
  canSubmit: boolean;
}) {
  const [flowOpen, setFlowOpen] = useState(false);
  const dateLabel = event.start_date === event.end_date
    ? fmtShort(event.start_date)
    : `${fmtShort(event.start_date)} – ${fmtShort(event.end_date)}`;

  const conv = ownReport && ownReport.acquired > 0
    ? Math.round((ownReport.total_opened / ownReport.acquired) * 100)
    : 0;

  return (
    <>
      {/* Event hero */}
      <div className="px-2 pt-6">
        <div
          className="rounded-2xl px-5 py-4"
          style={{ background: "linear-gradient(135deg, var(--color-brand-red), var(--color-brand-red-d))" }}
        >
          <div
            className="font-extrabold text-[10px] uppercase mb-1"
            style={{ color: "rgba(255,255,255,0.7)", letterSpacing: "0.12em" }}
          >
            {event.status === "closed" ? "Closed campaign" : "Active campaign"}
          </div>
          <div className="font-black text-[22px] text-white" style={{ letterSpacing: "-0.025em", lineHeight: 1.2 }}>
            {event.name}
          </div>
          <div className="flex items-center gap-4 mt-2 text-white text-[13px] font-bold">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {event.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {dateLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Your submission */}
      <div className="px-2 pt-10">
        <div
          className="font-extrabold text-[11px] uppercase mb-3"
          style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}
        >
          Your submission
        </div>

        {ownReport ? (
          <div
            className="rounded-2xl p-5"
            style={{ background: "white", border: "1.5px solid var(--color-line)" }}
          >
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <div className="num" style={{ fontSize: 40, color: "var(--color-ink)", lineHeight: 1, letterSpacing: "-0.04em" }}>
                  {ownReport.total_opened}<span style={{ color: "var(--color-muted)", fontWeight: 800, fontSize: 22 }}> / {ownReport.acquired}</span>
                </div>
                <div className="font-bold text-[12px] mt-1.5" style={{ color: "var(--color-body)" }}>
                  opened of <span className="num">{ownReport.acquired}</span> acquired
                  {ownReport.acquired > 0 && <> · <b className="num">{conv}%</b> conversion</>}
                </div>
              </div>
            </div>

            {/* Type breakdown */}
            {ownReport.total_opened > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {ACCOUNT_TYPES.map((t) => {
                  const v = ownReport[`type_${t.key}` as `type_${typeof t.key}`];
                  if (v === 0) return null;
                  return (
                    <span
                      key={t.key}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-extrabold text-[11px]"
                      style={{
                        background: `var(--color-${t.key}bg)`,
                        color: `var(--color-${t.key})`,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      <span className="num">{v}</span> {t.code}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="font-bold text-[11px] mt-4 pt-3" style={{ color: "var(--color-muted)", borderTop: "1px solid #F1F5F9" }}>
              Last updated {new Date(ownReport.edited_at ?? ownReport.submitted_at).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: "white", border: "1.5px dashed var(--color-line)" }}
          >
            <div className="font-bold text-[14px]" style={{ color: "var(--color-muted)" }}>
              You haven&apos;t logged this campaign yet.
            </div>
          </div>
        )}

        {/* Action */}
        {canSubmit ? (
          <button
            onClick={() => setFlowOpen(true)}
            className="w-full rounded-2xl py-4 text-[16px] font-black flex items-center justify-center gap-2 text-white mt-3"
            style={{ background: "var(--color-brand-red)", padding: 18 }}
          >
            {ownReport ? (
              <><Edit3 className="w-[18px] h-[18px]" /> Edit my numbers</>
            ) : (
              <><Plus className="w-[18px] h-[18px]" /> Log my numbers</>
            )}
          </button>
        ) : (
          <div
            className="mt-3 rounded-2xl py-3.5 text-center font-extrabold text-[13px] flex items-center justify-center gap-2"
            style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-muted)" }}
          >
            <Lock className="w-3.5 h-3.5" /> Campaign closed
          </div>
        )}
      </div>

      {/* Tally flow */}
      {flowOpen && (
        <EventTallyFlow
          eventId={event.id}
          existing={ownReport}
          onClose={() => setFlowOpen(false)}
        />
      )}
    </>
  );
}
