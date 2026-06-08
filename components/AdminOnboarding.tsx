"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronLeft, Check, Shield, KeyRound } from "lucide-react";

type Props = {
  initialFirstName: string;
  initialLastName: string;
  divisionName: string;
};

type Step = "name" | "password";

export function AdminOnboarding({ initialFirstName, initialLastName, divisionName }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [firstName, setFirstName] = useState(initialFirstName ?? "");
  const [lastName, setLastName] = useState(initialLastName ?? "");
  const [pwd, setPwd] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (step === "name") document.getElementById("admin-first")?.focus();
    if (step === "password") document.getElementById("admin-pwd-new")?.focus();
  }, [step]);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          new_password: pwd,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save.");
        setLoading(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setLoading(false);
    }
  }

  return (
    <section className="min-h-screen" style={{ background: "var(--color-canvas)" }}>
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, var(--color-ink) 0%, #1a1a1a 100%)",
          padding: "44px 24px 36px",
          borderRadius: "0 0 32px 32px",
        }}
      >
        <div
          className="w-12 h-12 rounded-[14px] mb-3 flex items-center justify-center"
          style={{ background: "var(--color-brand-gold)", color: "var(--color-ink)" }}
        >
          <Shield className="w-6 h-6" strokeWidth={2.25} />
        </div>
        <div className="text-[11px] font-extrabold uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.6)" }}>
          Admin onboarding
        </div>
        <div className="font-black text-white mt-1.5" style={{ fontSize: 28, letterSpacing: "-0.03em" }}>
          Set up your account
        </div>
        <div className="font-bold text-[13px] mt-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>
          {divisionName}
        </div>

        <div className="flex items-center gap-2 mt-5">
          {(["name", "password"] as Step[]).map((s, i) => {
            const active = step === s;
            const done = (["name", "password"] as Step[]).indexOf(step) > i;
            return (
              <div
                key={s}
                className="flex-1 h-1.5 rounded-full"
                style={{ background: active || done ? "var(--color-brand-gold)" : "rgba(255,255,255,0.2)" }}
              />
            );
          })}
        </div>
      </div>

      <div className="px-5 pt-7 pb-24 max-w-md mx-auto">
        {step === "name" && (
          <>
            <h2 className="text-[22px] font-black mb-1" style={{ color: "var(--color-ink)", letterSpacing: "-0.02em" }}>
              Confirm your name
            </h2>
            <p className="text-[13px] font-bold mb-6" style={{ color: "var(--color-body)" }}>
              This appears on admin actions across the division.
            </p>

            <label className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
              First name
            </label>
            <input
              id="admin-first"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoCapitalize="words"
              className="w-full mt-1.5 mb-4 px-4 py-3.5 rounded-[12px] font-extrabold text-[15px] outline-none"
              style={{
                background: "var(--color-bg)",
                border: "1.5px solid var(--color-line)",
                color: "var(--color-ink)",
              }}
            />

            <label className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
              Last name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoCapitalize="words"
              className="w-full mt-1.5 mb-6 px-4 py-3.5 rounded-[12px] font-extrabold text-[15px] outline-none"
              style={{
                background: "var(--color-bg)",
                border: "1.5px solid var(--color-line)",
                color: "var(--color-ink)",
              }}
            />

            <button
              onClick={() => { setError(null); setStep("password"); }}
              disabled={!firstName.trim()}
              className="w-full rounded-[14px] py-4 text-[15px] font-black flex items-center justify-center gap-2 text-white disabled:opacity-40"
              style={{ background: "var(--color-ink)" }}
            >
              Continue <ArrowRight className="w-[18px] h-[18px]" />
            </button>
          </>
        )}

        {step === "password" && (
          <>
            <button
              onClick={() => setStep("name")}
              className="text-[13px] font-extrabold inline-flex items-center gap-1 mb-4 py-1.5"
              style={{ color: "var(--color-body)" }}
            >
              <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.25} /> Back
            </button>

            <div
              className="w-12 h-12 rounded-[14px] mb-4 flex items-center justify-center"
              style={{ background: "var(--color-ink)", color: "var(--color-brand-gold)" }}
            >
              <KeyRound className="w-6 h-6" strokeWidth={2.25} />
            </div>
            <h2 className="text-[22px] font-black mb-1" style={{ color: "var(--color-ink)", letterSpacing: "-0.02em" }}>
              Change your password
            </h2>
            <p className="text-[13px] font-bold mb-6" style={{ color: "var(--color-body)" }}>
              At least 8 characters. Don't reuse the default.
            </p>

            <label className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
              New password
            </label>
            <input
              id="admin-pwd-new"
              type="password"
              autoComplete="new-password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="w-full mt-1.5 mb-4 px-4 py-3.5 rounded-[12px] font-extrabold text-[15px] outline-none"
              style={{
                background: "var(--color-bg)",
                border: "1.5px solid var(--color-line)",
                color: "var(--color-ink)",
                letterSpacing: "0.04em",
              }}
            />

            <label className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
              Confirm password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={pwdConfirm}
              onChange={(e) => setPwdConfirm(e.target.value)}
              className="w-full mt-1.5 mb-3 px-4 py-3.5 rounded-[12px] font-extrabold text-[15px] outline-none"
              style={{
                background: "var(--color-bg)",
                border: "1.5px solid var(--color-line)",
                color: "var(--color-ink)",
                letterSpacing: "0.04em",
              }}
            />

            <div className="text-center text-[12px] font-bold mb-4 min-h-[18px]" style={{ color: error ? "#DC2626" : "var(--color-muted)" }}>
              {error ?? (pwd && pwdConfirm && pwd !== pwdConfirm ? "Passwords don't match yet" : " ")}
            </div>

            <button
              onClick={() => {
                if (pwd.length < 8) { setError("At least 8 characters"); return; }
                if (pwd === "admin2026") { setError("Pick a new password, not the default"); return; }
                if (pwd !== pwdConfirm) { setError("Passwords don't match"); return; }
                submit();
              }}
              disabled={loading || pwd.length < 8 || !pwdConfirm}
              className="w-full rounded-[14px] py-4 text-[15px] font-black flex items-center justify-center gap-2 text-white disabled:opacity-40"
              style={{ background: "var(--color-ink)" }}
            >
              {loading ? "Saving…" : <>Finish setup <Check className="w-[18px] h-[18px]" /></>}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
