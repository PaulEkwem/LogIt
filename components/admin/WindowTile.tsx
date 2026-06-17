"use client";

import { Lock, Unlock, Download } from "lucide-react";
import { useWindowAction } from "@/lib/useRequestWindow";
import { CountdownOverlay } from "./CountdownOverlay";

export type WindowState = {
  opened_at: string | null;
  closed_at: string | null;
  filed: number;
  total: number;
};

const SLOT_LABEL: Record<string, string> = {
  single: "acquisition",
  midday: "12pm retention",
  eod: "5pm retention",
};

export function WindowTile({
  label, sublabel, reportType, slot, state, downloadHref,
}: {
  label: string;
  sublabel: string;
  reportType: "acquisition" | "retention";
  slot: "single" | "midday" | "eod";
  state: WindowState;
  downloadHref: string | null;
}) {
  const { phase, active, fire, finish } = useWindowAction();
  const busy = phase !== "idle";
  const opened = !!state.opened_at;
  const closed = !!state.closed_at;
  const live = opened && !closed;
  const filledPct = state.total > 0 ? Math.min(100, Math.round((state.filed / state.total) * 100)) : 0;

  function clickRequest() {
    fire({ variant: "request", reportType, slot, label: `Request ${SLOT_LABEL[slot]}` });
  }
  function clickClose() {
    fire({ variant: "close", reportType, slot, label: `Closing ${SLOT_LABEL[slot]}` });
  }
  function clickReopen() {
    fire({ variant: "reopen", reportType, slot, label: `Reopening ${SLOT_LABEL[slot]}` });
  }

  const statusLabel = !opened ? "Not opened" : closed ? "Closed" : "Live";
  const statusColor = !opened ? "var(--color-muted)" : closed ? "var(--color-muted)" : "var(--color-funded)";
  const statusBg    = !opened ? "#F1F5F9" : closed ? "#F1F5F9" : "#ECFDF5";

  return (
    <>
      <div className="rounded-2xl p-3.5" style={{ background: "white", border: live ? "1.5px solid var(--color-funded)" : "1.5px solid var(--color-line)" }}>
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
            <button onClick={clickRequest} disabled={busy} className="rounded-lg px-3 py-2 font-extrabold text-[12px] inline-flex items-center gap-1.5 text-white disabled:opacity-40" style={{ background: "var(--color-brand-red)" }}>
              <Unlock className="w-3.5 h-3.5" /> Open
            </button>
          )}
          {live && (
            <button onClick={clickClose} disabled={busy} className="rounded-lg px-3 py-2 font-extrabold text-[12px] inline-flex items-center gap-1.5 disabled:opacity-40" style={{ background: "white", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}>
              <Lock className="w-3.5 h-3.5" /> Close early
            </button>
          )}
          {closed && (
            <button onClick={clickReopen} disabled={busy} className="rounded-lg px-3 py-2 font-extrabold text-[12px] inline-flex items-center gap-1.5 disabled:opacity-40" style={{ background: "white", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}>
              <Unlock className="w-3.5 h-3.5" /> Re-open
            </button>
          )}
          {downloadHref && state.filed > 0 && (
            <a href={downloadHref} target="_blank" rel="noopener" className="rounded-lg px-3 py-2 font-extrabold text-[12px] inline-flex items-center gap-1.5" style={{ background: "var(--color-ink)", color: "white" }}>
              <Download className="w-3.5 h-3.5" /> Download PDF
            </a>
          )}
        </div>
      </div>

      {phase === "counting" && active && (
        <CountdownOverlay variant={active.variant} label={active.label} onDone={finish} />
      )}
    </>
  );
}
