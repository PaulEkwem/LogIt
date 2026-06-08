"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronLeft, Check, User2, Building2, KeyRound } from "lucide-react";

type Pc = { id: string; name: string; pc_code: string };
type Division = { id: string; name: string };

type Props = {
  amCode: string;
  initialFirstName: string;
  initialLastName: string;
  initialTeamLabel: string | null;
  pc: Pc;
  division: Division;
};

type Step = "name" | "team" | "pin";

export function AmOnboarding({
  amCode, initialFirstName, initialLastName, initialTeamLabel, pc, division,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [firstName, setFirstName] = useState(initialFirstName ?? "");
  const [lastName, setLastName] = useState(initialLastName ?? "");
  const [teamLabel, setTeamLabel] = useState(initialTeamLabel ?? "");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);
  const pinConfirmRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (step === "pin") pinRefs.current[0]?.focus();
    else if (step === "name") document.getElementById("first-name-field")?.focus();
  }, [step]);

  function handlePinInput(refs: typeof pinRefs, value: string, set: (v: string) => void, i: number, v: string) {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = value.split("");
    next[i] = digit;
    const joined = next.join("").slice(0, 4);
    set(joined);
    if (digit && i < 3) refs.current[i + 1]?.focus();
  }

  function handlePinKey(refs: typeof pinRefs, value: string, set: (v: string) => void, i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
      const next = value.split("");
      next[i - 1] = "";
      set(next.join(""));
      e.preventDefault();
    }
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/am", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          team_label: teamLabel.trim() || null,
          new_pin: pin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save.");
        setLoading(false);
        return;
      }
      router.push("/home");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setLoading(false);
    }
  }

  return (
    <section className="min-h-screen" style={{ background: "var(--color-canvas)" }}>
      {/* Header band */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, var(--color-brand-red) 0%, var(--color-brand-red-d) 100%)",
          padding: "44px 24px 36px",
          borderRadius: "0 0 32px 32px",
        }}
      >
        <div className="text-[11px] font-extrabold uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.72)" }}>
          Welcome to LogIt
        </div>
        <div className="font-black text-white mt-2" style={{ fontSize: 30, letterSpacing: "-0.03em" }}>
          Set up your account
        </div>
        <div className="font-bold text-[13px] mt-1.5" style={{ color: "rgba(255,255,255,0.78)" }}>
          Code <b className="text-white">{amCode}</b> · 3 quick steps
        </div>

        {/* Steps pill */}
        <div className="flex items-center gap-2 mt-5">
          {(["name", "team", "pin"] as Step[]).map((s, i) => {
            const active = step === s;
            const done = (["name", "team", "pin"] as Step[]).indexOf(step) > i;
            return (
              <div
                key={s}
                className="flex-1 h-1.5 rounded-full"
                style={{
                  background: active || done ? "var(--color-brand-gold)" : "rgba(255,255,255,0.25)",
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="px-5 pt-7 pb-24 max-w-md mx-auto">
        {step === "name" && (
          <>
            <div
              className="w-12 h-12 rounded-[14px] mb-4 flex items-center justify-center"
              style={{ background: "var(--color-ink)", color: "var(--color-brand-gold)" }}
            >
              <User2 className="w-6 h-6" strokeWidth={2.25} />
            </div>
            <h2 className="text-[22px] font-black mb-1" style={{ color: "var(--color-ink)", letterSpacing: "-0.02em" }}>
              Confirm your name
            </h2>
            <p className="text-[13px] font-bold mb-6" style={{ color: "var(--color-body)" }}>
              This is how you'll appear on the leaderboard and in reports.
            </p>

            <label className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
              First name
            </label>
            <input
              id="first-name-field"
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
              onClick={() => { setError(null); setStep("team"); }}
              disabled={!firstName.trim()}
              className="w-full rounded-[14px] py-4 text-[15px] font-black flex items-center justify-center gap-2 text-white disabled:opacity-40"
              style={{ background: "var(--color-ink)" }}
            >
              Continue <ArrowRight className="w-[18px] h-[18px]" />
            </button>
          </>
        )}

        {step === "team" && (
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
              <Building2 className="w-6 h-6" strokeWidth={2.25} />
            </div>
            <h2 className="text-[22px] font-black mb-1" style={{ color: "var(--color-ink)", letterSpacing: "-0.02em" }}>
              Confirm your team
            </h2>
            <p className="text-[13px] font-bold mb-6" style={{ color: "var(--color-body)" }}>
              Tell us where you actually work. Your PC code stays the same.
            </p>

            <div className="rounded-[14px] p-4 mb-5" style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)" }}>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
                Your PC
              </div>
              <div className="font-black text-[16px] mt-1" style={{ color: "var(--color-ink)" }}>
                {pc.name} <span style={{ color: "var(--color-muted)" }}>· {pc.pc_code}</span>
              </div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] mt-3" style={{ color: "var(--color-muted)" }}>
                Division
              </div>
              <div className="font-black text-[14px] mt-1" style={{ color: "var(--color-ink)" }}>
                {division.name}
              </div>
            </div>

            <label className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
              Team you actually work on
            </label>
            <input
              type="text"
              value={teamLabel}
              onChange={(e) => setTeamLabel(e.target.value)}
              placeholder={pc.name}
              autoCapitalize="words"
              className="w-full mt-1.5 mb-2 px-4 py-3.5 rounded-[12px] font-extrabold text-[15px] outline-none"
              style={{
                background: "var(--color-bg)",
                border: "1.5px solid var(--color-line)",
                color: "var(--color-ink)",
              }}
            />
            <div className="text-[12px] font-bold mb-6" style={{ color: "var(--color-muted)" }}>
              Leave blank if you're on the {pc.name} team. Only fill this if you're temporarily logging under another team's PC code.
            </div>

            <button
              onClick={() => { setError(null); setStep("pin"); }}
              className="w-full rounded-[14px] py-4 text-[15px] font-black flex items-center justify-center gap-2 text-white"
              style={{ background: "var(--color-ink)" }}
            >
              Continue <ArrowRight className="w-[18px] h-[18px]" />
            </button>
          </>
        )}

        {step === "pin" && (
          <>
            <button
              onClick={() => setStep("team")}
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
              Change your PIN
            </h2>
            <p className="text-[13px] font-bold mb-6" style={{ color: "var(--color-body)" }}>
              Pick a 4-digit PIN you'll remember. Anything but <b>1234</b>.
            </p>

            <label className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
              New PIN
            </label>
            <div className="flex items-center justify-center gap-2 mt-2 mb-5">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  ref={(el) => { pinRefs.current[i] = el; }}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={pin[i] ?? ""}
                  onChange={(e) => handlePinInput(pinRefs, pin, setPin, i, e.target.value)}
                  onKeyDown={(e) => handlePinKey(pinRefs, pin, setPin, i, e)}
                  className="w-[54px] h-[66px] rounded-[14px] text-center font-black text-[30px] outline-none"
                  style={{
                    background: "var(--color-bg)",
                    border: pin[i] ? "1.5px solid var(--color-ink)" : "1.5px solid var(--color-line)",
                    color: "var(--color-ink)",
                  }}
                />
              ))}
            </div>

            <label className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
              Confirm PIN
            </label>
            <div className="flex items-center justify-center gap-2 mt-2 mb-4">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  ref={(el) => { pinConfirmRefs.current[i] = el; }}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={pinConfirm[i] ?? ""}
                  onChange={(e) => handlePinInput(pinConfirmRefs, pinConfirm, setPinConfirm, i, e.target.value)}
                  onKeyDown={(e) => handlePinKey(pinConfirmRefs, pinConfirm, setPinConfirm, i, e)}
                  className="w-[54px] h-[66px] rounded-[14px] text-center font-black text-[30px] outline-none"
                  style={{
                    background: "var(--color-bg)",
                    border: pinConfirm[i] ? "1.5px solid var(--color-ink)" : "1.5px solid var(--color-line)",
                    color: "var(--color-ink)",
                  }}
                />
              ))}
            </div>

            <div className="text-center text-[12px] font-bold mb-4 min-h-[18px]" style={{ color: error ? "#DC2626" : "var(--color-muted)" }}>
              {error ?? (pin && pinConfirm && pin !== pinConfirm ? "PINs don't match yet" : "Both PINs must match")}
            </div>

            <button
              onClick={() => {
                if (pin === "1234") { setError("Pick a new PIN, not the default"); return; }
                if (pin.length !== 4) { setError("PIN must be 4 digits"); return; }
                if (pin !== pinConfirm) { setError("PINs don't match"); return; }
                submit();
              }}
              disabled={loading || pin.length !== 4 || pinConfirm.length !== 4}
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
