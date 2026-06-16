"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, KeyRound, Archive, ArchiveRestore, Check, X, Plus, UserPlus } from "lucide-react";

export type FlatAm = {
  id: string;
  full_name: string;
  am_code: string;
  initials: string;
  color: string;
  pc_id: string;
  pc_name: string;
  pc_code: string;
  archived: boolean;
};

export type TeamPick = {
  id: string;
  name: string;
  pc_code: string;
};

export function AmsList({ ams, teams }: { ams: FlatAm[]; teams: TeamPick[] }) {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const visible = ams.filter((a) => (showArchived ? true : !a.archived))
    .sort((a, b) => a.am_code.localeCompare(b.am_code));
  const archivedCount = ams.filter((a) => a.archived).length;

  async function call(body: object) {
    const res = await fetch("/api/admin/ams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Failed"); return false; }
    return true;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="font-extrabold text-[11px] uppercase" style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}>
          Account Managers · {ams.filter((a) => !a.archived).length}
        </div>
        <div className="flex items-center gap-3">
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="font-extrabold text-[10px] uppercase"
              style={{ color: "var(--color-muted)", letterSpacing: "0.1em" }}
            >
              {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
            </button>
          )}
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="rounded-lg px-3 py-2 font-extrabold text-[12px] inline-flex items-center gap-1.5 text-white"
              style={{ background: "var(--color-brand-red)" }}
            >
              <Plus className="w-3.5 h-3.5" /> Add AM
            </button>
          )}
        </div>
      </div>

      {adding && (
        <NewAmForm
          teams={teams}
          onCancel={() => setAdding(false)}
          onSuccess={() => { setAdding(false); router.refresh(); }}
        />
      )}

      <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
        {visible.length === 0 && (
          <div className="text-center py-8 text-[13px] font-bold" style={{ color: "var(--color-muted)" }}>
            No AMs yet. Use <b>+ Add AM</b> above to create one.
          </div>
        )}
        {visible.map((am, i) => (
          editingId === am.id ? (
            <EditAmRow
              key={am.id}
              am={am}
              first={i === 0}
              onCancel={() => setEditingId(null)}
              onSaved={() => { setEditingId(null); router.refresh(); }}
            />
          ) : (
            <ViewRow
              key={am.id}
              am={am}
              first={i === 0}
              onEdit={() => setEditingId(am.id)}
              onResetPin={async () => {
                if (!confirm(`Reset ${am.full_name}'s PIN back to 1234?`)) return;
                if (await call({ action: "reset_pin", am_id: am.id })) router.refresh();
              }}
              onArchive={async () => {
                if (!confirm(`Archive ${am.full_name}? Their data stays but they won't show on active lists.`)) return;
                if (await call({ action: "archive", am_id: am.id })) router.refresh();
              }}
              onRestore={async () => {
                if (await call({ action: "restore", am_id: am.id })) router.refresh();
              }}
            />
          )
        ))}
      </div>
    </>
  );
}

function ViewRow({
  am, first, onEdit, onResetPin, onArchive, onRestore,
}: {
  am: FlatAm;
  first: boolean;
  onEdit: () => void;
  onResetPin: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  return (
    <div
      className="grid items-center gap-3 px-3 py-2.5"
      style={{
        gridTemplateColumns: "30px 1fr auto",
        borderTop: first ? "none" : "1px solid #F1F5F9",
        opacity: am.archived ? 0.55 : 1,
      }}
    >
      <div
        className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-white font-extrabold flex-shrink-0"
        style={{ background: am.color, fontSize: 11, letterSpacing: "-0.01em" }}
      >
        {am.initials}
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-[14px] truncate flex items-center gap-2" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>
          <span className="truncate">{am.full_name}</span>
          {am.archived && (
            <span className="font-extrabold text-[9px] rounded-md px-1.5 py-0.5" style={{ background: "#FEF3C7", color: "var(--color-pending)", letterSpacing: "0.06em" }}>
              ARCHIVED
            </span>
          )}
        </div>
        <div className="font-bold text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
          {am.am_code} · {am.pc_name} <span style={{ color: "var(--color-line)" }}>·</span> PC {am.pc_code}
        </div>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        {am.archived ? (
          <IconBtn label="Restore" onClick={onRestore}>
            <ArchiveRestore className="w-3.5 h-3.5" />
          </IconBtn>
        ) : (
          <>
            <IconBtn label="Rename" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" />
            </IconBtn>
            <IconBtn label="Reset PIN" onClick={onResetPin}>
              <KeyRound className="w-3.5 h-3.5" />
            </IconBtn>
            <IconBtn label="Archive" onClick={onArchive} danger>
              <Archive className="w-3.5 h-3.5" />
            </IconBtn>
          </>
        )}
      </div>
    </div>
  );
}

function EditAmRow({
  am, first, onCancel, onSaved,
}: {
  am: FlatAm;
  first: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [first_name, setFirst] = useState(am.full_name.split(" ")[0] ?? am.full_name);
  const [last_name, setLast]   = useState(am.full_name.split(" ").slice(1).join(" "));
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!first_name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/ams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rename", am_id: am.id, first_name, last_name }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { alert(data.error ?? "Failed"); return; }
    onSaved();
  }

  return (
    <div className="px-3 py-2.5" style={{ borderTop: first ? "none" : "1px solid #F1F5F9" }}>
      <div className="font-extrabold text-[10px] uppercase mb-1.5" style={{ color: "var(--color-muted)", letterSpacing: "0.1em" }}>
        Rename · {am.am_code}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input autoFocus value={first_name} onChange={(e) => setFirst(e.target.value)} placeholder="First name"
          className="rounded-lg px-3 py-2 font-extrabold text-[13px] outline-none"
          style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }} />
        <input value={last_name} onChange={(e) => setLast(e.target.value)} placeholder="Last name"
          className="rounded-lg px-3 py-2 font-extrabold text-[13px] outline-none"
          style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }} />
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={save} disabled={busy || !first_name.trim()} className="flex-1 rounded-lg py-2 font-black text-[12px] text-white disabled:opacity-40 inline-flex items-center justify-center gap-1.5" style={{ background: "var(--color-brand-red)" }}>
          <Check className="w-3.5 h-3.5" /> Save
        </button>
        <button onClick={onCancel} className="rounded-lg px-3 py-2 font-extrabold text-[12px]" style={{ background: "#F1F5F9", color: "var(--color-ink)" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function NewAmForm({ teams, onCancel, onSuccess }: { teams: TeamPick[]; onCancel: () => void; onSuccess: () => void }) {
  const [pcId, setPcId] = useState<string>(teams[0]?.id ?? "");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedTeam = teams.find((t) => t.id === pcId);
  const placeholderCode = selectedTeam ? `e.g. ${selectedTeam.pc_code}5` : "4-digit AM code";

  async function submit() {
    if (!pcId || !first.trim() || code.length !== 4) return;
    setBusy(true);
    const res = await fetch("/api/admin/ams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", pc_id: pcId, first_name: first, last_name: last, am_code: code }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { alert(data.error ?? "Failed"); return; }
    onSuccess();
  }

  return (
    <div className="rounded-2xl p-4 mb-3" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
      <div className="flex justify-between items-center mb-3">
        <div className="font-black text-[13px] inline-flex items-center gap-1.5" style={{ color: "var(--color-ink)" }}>
          <UserPlus className="w-4 h-4" /> New Account Manager
        </div>
        <button onClick={onCancel} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#F1F5F9", color: "var(--color-ink)" }}>
          <X className="w-3 h-3" />
        </button>
      </div>
      <Field label="Team">
        <select
          value={pcId}
          onChange={(e) => setPcId(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 font-bold text-[14px] outline-none"
          style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name} · PC {t.pc_code}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <Field label="First name">
          <input autoFocus value={first} onChange={(e) => setFirst(e.target.value)}
            placeholder="First name"
            className="w-full rounded-lg px-3 py-2.5 font-bold text-[14px] outline-none"
            style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }} />
        </Field>
        <Field label="Last name (optional)">
          <input value={last} onChange={(e) => setLast(e.target.value)}
            placeholder="Last name"
            className="w-full rounded-lg px-3 py-2.5 font-bold text-[14px] outline-none"
            style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }} />
        </Field>
      </div>
      <Field label="4-digit AM code">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          placeholder={placeholderCode}
          className="w-full rounded-lg px-3 py-2.5 font-bold text-[14px] outline-none num"
          style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
        />
      </Field>

      <button
        onClick={submit}
        disabled={busy || !first.trim() || code.length !== 4 || !pcId}
        className="w-full mt-3 rounded-xl py-2.5 font-black text-[13px] flex items-center justify-center gap-2 text-white disabled:opacity-40"
        style={{ background: "var(--color-brand-red)" }}
      >
        <Check className="w-4 h-4" /> {busy ? "Creating…" : "Create AM"}
      </button>
      <div className="text-center mt-2 text-[11px] font-bold" style={{ color: "var(--color-muted)" }}>
        Default PIN <b>1234</b> · they&apos;ll set their own on first login
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2 first:mt-0">
      <div className="font-extrabold text-[10px] uppercase mb-1" style={{ color: "var(--color-muted)", letterSpacing: "0.12em" }}>{label}</div>
      {children}
    </div>
  );
}

function IconBtn({ children, label, onClick, danger = false }: { children: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
      style={{
        background: danger ? "white" : "#F1F5F9",
        color: danger ? "var(--color-pending)" : "var(--color-ink)",
        border: danger ? "1.5px solid var(--color-pending)" : "none",
      }}
    >
      {children}
    </button>
  );
}
