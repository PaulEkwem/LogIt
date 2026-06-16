"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, KeyRound, Archive, Check } from "lucide-react";

export type AdminAmRow = {
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

export function AmActionRow({
  row, first, showActions = true,
}: {
  row: AdminAmRow;
  first: boolean;
  showActions?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | "actions">("view");
  const [first_name, setFirst] = useState(row.full_name.split(" ")[0] ?? row.full_name);
  const [last_name, setLast]   = useState(row.full_name.split(" ").slice(1).join(" "));
  const [busy, setBusy] = useState(false);

  async function call(body: object) {
    setBusy(true);
    const res = await fetch("/api/admin/ams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { alert(data.error ?? "Failed"); return false; }
    return true;
  }

  async function rename() {
    if (await call({ action: "rename", am_id: row.id, first_name, last_name })) {
      setMode("view"); router.refresh();
    }
  }
  async function resetPin() {
    if (!confirm(`Reset ${row.full_name}'s PIN back to 1234?`)) return;
    if (await call({ action: "reset_pin", am_id: row.id })) router.refresh();
  }
  async function archive() {
    if (!confirm(`Archive ${row.full_name}? Their data stays but they won't show on active lists.`)) return;
    if (await call({ action: "archive", am_id: row.id })) router.refresh();
  }

  if (mode === "edit") {
    return (
      <div className="py-3 px-1" style={{ borderTop: first ? "none" : "1px solid #F1F5F9" }}>
        <div className="grid grid-cols-2 gap-2">
          <input
            autoFocus value={first_name} onChange={(e) => setFirst(e.target.value)}
            placeholder="First name"
            className="rounded-lg px-3 py-2 font-extrabold text-[13px] outline-none"
            style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
          />
          <input
            value={last_name} onChange={(e) => setLast(e.target.value)}
            placeholder="Last name"
            className="rounded-lg px-3 py-2 font-extrabold text-[13px] outline-none"
            style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
          />
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={rename} disabled={busy || !first_name.trim()} className="flex-1 rounded-lg py-2 font-black text-[12px] text-white disabled:opacity-40 inline-flex items-center justify-center gap-1.5" style={{ background: "var(--color-brand-red)" }}>
            <Check className="w-3.5 h-3.5" /> Save
          </button>
          <button onClick={() => setMode("view")} className="rounded-lg px-3 py-2 font-extrabold text-[12px]" style={{ background: "#F1F5F9", color: "var(--color-ink)" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
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
        {showActions ? (
          <button
            onClick={() => setMode(mode === "actions" ? "view" : "actions")}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: mode === "actions" ? "var(--color-ink)" : "#F1F5F9", color: mode === "actions" ? "white" : "var(--color-ink)" }}
            aria-label="Actions"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span />
        )}
      </div>
      {showActions && mode === "actions" && (
        <div className="flex gap-2 pb-3 -mt-1">
          <button onClick={() => setMode("edit")} disabled={busy} className="flex-1 rounded-lg py-1.5 font-extrabold text-[11px] inline-flex items-center justify-center gap-1.5" style={{ background: "white", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}>
            <Pencil className="w-3 h-3" /> Rename
          </button>
          <button onClick={resetPin} disabled={busy} className="flex-1 rounded-lg py-1.5 font-extrabold text-[11px] inline-flex items-center justify-center gap-1.5" style={{ background: "white", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}>
            <KeyRound className="w-3 h-3" /> Reset PIN
          </button>
          <button onClick={archive} disabled={busy} className="flex-1 rounded-lg py-1.5 font-extrabold text-[11px] inline-flex items-center justify-center gap-1.5" style={{ background: "white", border: "1.5px solid var(--color-pending)", color: "var(--color-pending)" }}>
            <Archive className="w-3 h-3" /> Archive
          </button>
        </div>
      )}
    </>
  );
}
