"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive, ArchiveRestore, UserPlus, X, Check } from "lucide-react";

export type TeamItem = {
  pc_id: string;
  pc_name: string;
  pc_code: string;
  am_count: number;
  archived: boolean;
};

export function TeamManagement({ teams }: { teams: TeamItem[] }) {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingPcId, setEditingPcId] = useState<string | null>(null);
  const [addingAmPcId, setAddingAmPcId] = useState<string | null>(null);

  const visibleTeams = teams.filter((t) => showArchived ? true : !t.archived);
  const archivedCount = teams.filter((t) => t.archived).length;

  async function call(body: object) {
    const res = await fetch("/api/admin/pcs", {
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
      <div className="flex items-center justify-between mb-2">
        <div className="font-extrabold text-[11px] uppercase" style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}>
          Teams · {teams.filter((t) => !t.archived).length}
        </div>
        {archivedCount > 0 && (
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="font-extrabold text-[10px] uppercase"
            style={{ color: "var(--color-muted)", letterSpacing: "0.1em" }}
          >
            {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
          </button>
        )}
      </div>

      {/* Add team CTA */}
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="w-full rounded-2xl py-3.5 font-black text-[14px] flex items-center justify-center gap-2 text-white transition-transform active:scale-[0.99]"
          style={{ background: "linear-gradient(135deg, var(--color-brand-red), var(--color-brand-red-d))", letterSpacing: "-0.01em" }}
        >
          <Plus className="w-[18px] h-[18px]" strokeWidth={2.5} /> Add new team
        </button>
      ) : (
        <NewTeamForm
          onCancel={() => setCreating(false)}
          onSubmit={async (name, pc_code) => {
            const ok = await call({ action: "create", name, pc_code });
            if (ok) { setCreating(false); router.refresh(); }
          }}
        />
      )}

      {/* Teams list */}
      <div className="rounded-2xl mt-3 overflow-hidden" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
        {visibleTeams.map((team, i) => (
          <div key={team.pc_id} className="px-3.5 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid #F1F5F9", opacity: team.archived ? 0.55 : 1 }}>
            {editingPcId === team.pc_id ? (
              <RenameTeamForm
                initial={team.pc_name}
                onCancel={() => setEditingPcId(null)}
                onSubmit={async (name) => {
                  const ok = await call({ action: "rename", pc_id: team.pc_id, name });
                  if (ok) { setEditingPcId(null); router.refresh(); }
                }}
              />
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-[14px] truncate" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>
                      {team.pc_name}
                      <span className="font-extrabold text-[10px] rounded-md ml-2 px-1.5 py-0.5" style={{ background: "#F1F5F9", color: "var(--color-muted)", letterSpacing: "0.06em" }}>
                        PC {team.pc_code}
                      </span>
                      {team.archived && (
                        <span className="font-extrabold text-[10px] rounded-md ml-1.5 px-1.5 py-0.5" style={{ background: "#FEF3C7", color: "var(--color-pending)", letterSpacing: "0.06em" }}>
                          ARCHIVED
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                      {team.am_count} AM{team.am_count === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {!team.archived && (
                      <>
                        <IconBtn label="Add AM" onClick={() => setAddingAmPcId(team.pc_id)}>
                          <UserPlus className="w-3.5 h-3.5" />
                        </IconBtn>
                        <IconBtn label="Rename" onClick={() => setEditingPcId(team.pc_id)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </IconBtn>
                        <IconBtn label="Archive" onClick={async () => {
                          if (!confirm(`Archive ${team.pc_name}? AMs in this team won't be deleted but the team will hide from active lists.`)) return;
                          const ok = await call({ action: "archive", pc_id: team.pc_id });
                          if (ok) router.refresh();
                        }}>
                          <Archive className="w-3.5 h-3.5" />
                        </IconBtn>
                      </>
                    )}
                    {team.archived && (
                      <IconBtn label="Restore" onClick={async () => {
                        const ok = await call({ action: "restore", pc_id: team.pc_id });
                        if (ok) router.refresh();
                      }}>
                        <ArchiveRestore className="w-3.5 h-3.5" />
                      </IconBtn>
                    )}
                  </div>
                </div>

                {addingAmPcId === team.pc_id && (
                  <NewAmForm
                    pcCode={team.pc_code}
                    pcId={team.pc_id}
                    onCancel={() => setAddingAmPcId(null)}
                    onSuccess={() => { setAddingAmPcId(null); router.refresh(); }}
                  />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function NewTeamForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (name: string, code: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="rounded-2xl p-3.5" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
      <div className="flex justify-between items-center mb-3">
        <div className="font-black text-[13px]" style={{ color: "var(--color-ink)" }}>New team</div>
        <button onClick={onCancel} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#F1F5F9", color: "var(--color-ink)" }}>
          <X className="w-3 h-3" />
        </button>
      </div>
      <Field label="Team name">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Surulere"
          className="w-full rounded-lg px-3 py-2.5 font-bold text-[14px] outline-none"
          style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
        />
      </Field>
      <Field label="3-digit PC code">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
          inputMode="numeric"
          placeholder="e.g. 209"
          className="w-full rounded-lg px-3 py-2.5 font-bold text-[14px] outline-none num"
          style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
        />
      </Field>
      <button
        onClick={async () => { setBusy(true); await onSubmit(name, code); setBusy(false); }}
        disabled={busy || !name.trim() || code.length !== 3}
        className="w-full mt-3 rounded-xl py-2.5 font-black text-[13px] flex items-center justify-center gap-2 text-white disabled:opacity-40"
        style={{ background: "var(--color-brand-red)" }}
      >
        <Check className="w-4 h-4" /> {busy ? "Creating…" : "Create team"}
      </button>
    </div>
  );
}

function RenameTeamForm({ initial, onCancel, onSubmit }: { initial: string; onCancel: () => void; onSubmit: (name: string) => Promise<void> }) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 rounded-lg px-3 py-2 font-extrabold text-[13px] outline-none"
        style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-ink)", color: "var(--color-ink)" }}
      />
      <button
        onClick={async () => { setBusy(true); await onSubmit(name.trim()); setBusy(false); }}
        disabled={busy || !name.trim()}
        className="rounded-lg px-3 py-2 font-extrabold text-[12px] text-white disabled:opacity-40"
        style={{ background: "var(--color-brand-red)" }}
      >
        Save
      </button>
      <button onClick={onCancel} className="rounded-lg px-2 py-2" style={{ background: "#F1F5F9", color: "var(--color-ink)" }}>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function NewAmForm({ pcCode, pcId, onCancel, onSuccess }: { pcCode: string; pcId: string; onCancel: () => void; onSuccess: () => void }) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
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
    <div className="mt-3 rounded-xl p-3" style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)" }}>
      <div className="flex justify-between items-center mb-2">
        <div className="font-black text-[12px]" style={{ color: "var(--color-ink)" }}>New AM in PC {pcCode}</div>
        <button onClick={onCancel} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "white", color: "var(--color-ink)" }}>
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          autoFocus
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          placeholder="First name"
          className="rounded-lg px-3 py-2 font-extrabold text-[13px] outline-none"
          style={{ background: "white", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
        />
        <input
          value={last}
          onChange={(e) => setLast(e.target.value)}
          placeholder="Last name (optional)"
          className="rounded-lg px-3 py-2 font-extrabold text-[13px] outline-none"
          style={{ background: "white", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
        />
      </div>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        placeholder={`4-digit AM code (e.g. ${pcCode}5)`}
        className="w-full mt-2 rounded-lg px-3 py-2 font-extrabold text-[13px] outline-none num"
        style={{ background: "white", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
      />
      <button
        onClick={submit}
        disabled={busy || !first.trim() || code.length !== 4}
        className="w-full mt-2 rounded-lg py-2 font-black text-[12px] flex items-center justify-center gap-2 text-white disabled:opacity-40"
        style={{ background: "var(--color-brand-red)" }}
      >
        <Check className="w-3.5 h-3.5" /> {busy ? "Creating…" : "Create AM"}
      </button>
      <div className="text-center text-[10px] font-bold mt-1.5" style={{ color: "var(--color-muted)" }}>
        Default PIN <b>1234</b> · they&apos;ll set their own on first login
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2 first:mt-0">
      <div className="font-extrabold text-[10px] uppercase mb-1" style={{ color: "var(--color-muted)", letterSpacing: "0.12em" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
      style={{ background: "#F1F5F9", color: "var(--color-ink)" }}
    >
      {children}
    </button>
  );
}
