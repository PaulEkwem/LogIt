"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Check, LogOut, User } from "lucide-react";

export function AdminSettings({ full_name, email }: { full_name: string; email: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function changePassword() {
    setError(null);
    setSuccess(false);
    if (next.length < 8) { setError("New password must be at least 8 characters"); return; }
    if (next !== confirm) { setError("New password and confirmation don't match"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Couldn't update"); return; }
      setSuccess(true);
      setCurrent(""); setNext(""); setConfirm("");
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      {/* Profile card */}
      <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--color-ink)", color: "var(--color-brand-gold)" }}>
          <User className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-[16px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.015em" }}>
            {full_name}
          </div>
          <div className="font-bold text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
            {email}
          </div>
        </div>
      </div>

      {/* Change password */}
      <section>
        <div className="font-extrabold text-[11px] uppercase mb-2" style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}>
          Change password
        </div>
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
          <Field label="Current password">
            <input
              type="password" autoComplete="current-password"
              value={current} onChange={(e) => setCurrent(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 font-extrabold text-[14px] outline-none"
              style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
            />
          </Field>
          <Field label="New password (at least 8 characters)">
            <input
              type="password" autoComplete="new-password"
              value={next} onChange={(e) => setNext(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 font-extrabold text-[14px] outline-none"
              style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password" autoComplete="new-password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 font-extrabold text-[14px] outline-none"
              style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
            />
          </Field>
          {error && (
            <div className="text-center text-[12px] font-bold" style={{ color: "#DC2626" }}>{error}</div>
          )}
          {success && (
            <div className="text-center text-[12px] font-bold" style={{ color: "var(--color-funded)" }}>
              Password updated ✓
            </div>
          )}
          <button
            onClick={changePassword}
            disabled={busy || !current || !next || !confirm}
            className="rounded-lg py-2.5 font-black text-[13px] inline-flex items-center justify-center gap-2 text-white disabled:opacity-40"
            style={{ background: "var(--color-brand-red)" }}
          >
            <KeyRound className="w-4 h-4" /> {busy ? "Updating…" : "Update password"}
          </button>
        </div>
      </section>

      {/* Sign out */}
      <section>
        <div className="font-extrabold text-[11px] uppercase mb-2" style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}>
          Session
        </div>
        <button
          onClick={signOut}
          className="w-full rounded-2xl p-4 flex items-center gap-3 font-extrabold text-[13px]"
          style={{ background: "white", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </section>

      {/* Tip */}
      <div className="rounded-2xl p-4" style={{ background: "var(--color-bg)", border: "1.5px dashed var(--color-line)" }}>
        <div className="flex items-start gap-2">
          <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--color-funded)" }} strokeWidth={3} />
          <div className="font-bold text-[12px]" style={{ color: "var(--color-body)", lineHeight: 1.55 }}>
            Use a password you don&apos;t reuse anywhere else. After updating you&apos;ll stay signed in on
            this device; other devices will need to sign in again with the new password.
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-extrabold text-[10px] uppercase mb-1" style={{ color: "var(--color-muted)", letterSpacing: "0.12em" }}>{label}</div>
      {children}
    </div>
  );
}
