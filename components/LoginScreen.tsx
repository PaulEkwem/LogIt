"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronLeft, Shield } from "lucide-react";

type Step = "code" | "pin" | "admin-pwd";

export function LoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [adminPwd, setAdminPwd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);
  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Focus first code box on mount
  useEffect(() => {
    if (step === "code") codeRefs.current[0]?.focus();
    if (step === "pin")  pinRefs.current[0]?.focus();
    if (step === "admin-pwd") document.getElementById("admin-pwd-field")?.focus();
  }, [step]);

  // Auto-submit the moment we have 4 digits in code or PIN.
  // Effect-based so any path that produces a full value triggers submit,
  // not just the per-input handler.
  useEffect(() => {
    if (step === "code" && code.length === 4) {
      routeAfterCode(code);
    }
  }, [code, step]);

  useEffect(() => {
    if (step === "pin" && pin.length === 4 && !loading) {
      submitAmLogin(code, pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, step]);

  function handleCodeInput(i: number, v: string) {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = code.split("");
    next[i] = digit;
    const joined = next.join("").slice(0, 4);
    setCode(joined);
    if (digit && i < 3) codeRefs.current[i + 1]?.focus();
    // submit handled by useEffect watching `code`
  }

  function handleCodeKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      codeRefs.current[i - 1]?.focus();
      const next = code.split("");
      next[i - 1] = "";
      setCode(next.join(""));
      e.preventDefault();
    }
  }

  function routeAfterCode(c: string) {
    if (c === "3000") {
      setStep("admin-pwd");
      setError(null);
    } else {
      setStep("pin");
      setError(null);
    }
  }

  function handlePinInput(i: number, v: string) {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = pin.split("");
    next[i] = digit;
    const joined = next.join("").slice(0, 4);
    setPin(joined);
    if (digit && i < 3) pinRefs.current[i + 1]?.focus();
    // submit handled by useEffect watching `pin`
  }

  function handlePinKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !pin[i] && i > 0) {
      pinRefs.current[i - 1]?.focus();
      const next = pin.split("");
      next[i - 1] = "";
      setPin(next.join(""));
      e.preventDefault();
    }
  }

  async function submitAmLogin(c: string, p: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c, pin: p }),
      });
      const data = await res.json();
      if (!res.ok) {
        triggerShake();
        setError(data.error ?? "Sign in failed.");
        setTimeout(() => { setPin(""); pinRefs.current[0]?.focus(); }, 1500);
      } else {
        router.push("/home");
        router.refresh();
      }
    } catch {
      triggerShake();
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAdminLogin() {
    if (!adminPwd) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "3000", password: adminPwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        triggerShake();
        setError(data.error ?? "Sign in failed.");
        setTimeout(() => { setAdminPwd(""); document.getElementById("admin-pwd-field")?.focus(); }, 1500);
      } else {
        router.push("/admin");
        router.refresh();
      }
    } catch {
      triggerShake();
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  function back() {
    setStep("code");
    setCode("");
    setPin("");
    setAdminPwd("");
    setError(null);
  }

  return (
    <section>
      {/* Hero */}
      <div
        className="relative overflow-hidden text-center"
        style={{
          background: "linear-gradient(160deg, var(--color-brand-red) 0%, var(--color-brand-red-d) 100%)",
          padding: "64px 28px 52px",
          borderRadius: "0 0 36px 36px",
        }}
      >
        <div className="font-black text-white" style={{ fontSize: 48, letterSpacing: "-0.045em" }}>
          Log<span style={{ color: "var(--color-brand-gold)" }}>It</span>
        </div>
        <div className="font-bold text-sm mt-2.5" style={{ color: "rgba(255,255,255,0.72)" }}>
          Log it. Track it. Send it.
        </div>
      </div>

      <div className="pt-9 pb-15 px-5">
        {step === "code" && (
          <>
            <h2 className="text-[22px] font-black mb-1" style={{ letterSpacing: "-0.02em", color: "var(--color-ink)" }}>
              Sign in
            </h2>
            <p className="text-[13px] font-bold mb-6" style={{ color: "var(--color-body)" }}>
              Enter your 4-digit Account Manager code
            </p>

            <div className={`flex items-center justify-center gap-2 my-7 mb-2 ${shake ? "animate-[codeShake_0.4s]" : ""}`}>
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={code[i] ?? ""}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className="w-[54px] h-[66px] rounded-[14px] text-center font-black text-[30px] outline-none transition-all"
                  style={{
                    background: "var(--color-bg)",
                    border: code[i] ? "1.5px solid var(--color-ink)" : "1.5px solid var(--color-line)",
                    color: "var(--color-ink)",
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                />
              ))}
            </div>
            <div
              className="text-center text-[12px] font-bold mt-4 min-h-[18px]"
              style={{ color: error ? "#DC2626" : "var(--color-muted)" }}
            >
              {error ?? "Your code was set up by your PC supervisor."}
            </div>
          </>
        )}

        {step === "pin" && (
          <>
            <button onClick={back} className="text-[13px] font-extrabold inline-flex items-center gap-1 mb-5 py-1.5" style={{ color: "var(--color-body)" }}>
              <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.25} /> Different code
            </button>
            <h2 className="text-[22px] font-black mb-1" style={{ letterSpacing: "-0.02em", color: "var(--color-ink)" }}>
              Enter your PIN
            </h2>
            <p className="text-[13px] font-bold mb-6" style={{ color: "var(--color-body)" }}>
              Code <b className="font-black" style={{ color: "var(--color-ink)" }}>{code}</b> — your 4-digit PIN
            </p>

            <div className={`flex items-center justify-center gap-2 my-7 mb-2 ${shake ? "animate-[codeShake_0.4s]" : ""}`}>
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  ref={(el) => { pinRefs.current[i] = el; }}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={pin[i] ?? ""}
                  onChange={(e) => handlePinInput(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  className="w-[54px] h-[66px] rounded-[14px] text-center font-black text-[30px] outline-none transition-all"
                  style={{
                    background: "var(--color-bg)",
                    border: pin[i] ? "1.5px solid var(--color-ink)" : "1.5px solid var(--color-line)",
                    color: "var(--color-ink)",
                    letterSpacing: "-0.02em",
                  }}
                />
              ))}
            </div>
            <div
              className="text-center text-[12px] font-bold mt-4 min-h-[18px]"
              style={{ color: error ? "#DC2626" : "var(--color-muted)" }}
            >
              {error ?? (loading || pin.length === 4 ? "Signing in…" : "Tap your PIN to continue")}
            </div>
          </>
        )}

        {step === "admin-pwd" && (
          <>
            <div
              className="w-14 h-14 rounded-[16px] mx-auto mb-4 flex items-center justify-center"
              style={{ background: "var(--color-ink)", color: "var(--color-brand-gold)" }}
            >
              <Shield className="w-7 h-7" strokeWidth={2.25} />
            </div>
            <div
              className="text-center text-[11px] font-extrabold uppercase mb-1.5"
              style={{ color: "var(--color-muted)", letterSpacing: "0.18em" }}
            >
              Admin access
            </div>
            <div
              className="text-center text-[22px] font-black mb-1.5"
              style={{ color: "var(--color-ink)", letterSpacing: "-0.025em" }}
            >
              Enter password
            </div>
            <div className="text-center text-[13px] font-bold mb-6" style={{ color: "var(--color-body)" }}>
              Code <b className="font-black" style={{ color: "var(--color-ink)" }}>3000</b> is reserved for admins.
            </div>

            <input
              id="admin-pwd-field"
              type="password"
              autoComplete="off"
              placeholder="Admin password"
              value={adminPwd}
              onChange={(e) => setAdminPwd(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitAdminLogin(); }}
              className={`w-full mb-3 px-4 py-4 rounded-[14px] font-extrabold text-[16px] outline-none transition-colors ${shake ? "animate-[codeShake_0.4s]" : ""}`}
              style={{
                background: "var(--color-bg)",
                border: error ? "1.5px solid #EF4444" : "1.5px solid var(--color-line)",
                color: "var(--color-ink)",
                letterSpacing: "0.04em",
              }}
            />
            <div
              className="text-center text-[12px] font-bold mb-3.5 min-h-[14px]"
              style={{ color: error ? "#DC2626" : "transparent" }}
            >
              {error}
            </div>

            <button
              onClick={submitAdminLogin}
              disabled={loading || !adminPwd}
              className="w-full rounded-[14px] py-4 text-[15px] font-black flex items-center justify-center gap-2 text-white disabled:opacity-40 transition-colors"
              style={{ background: "var(--color-ink)", letterSpacing: "-0.01em" }}
            >
              {loading ? "Signing in…" : <>Sign in <ArrowRight className="w-[18px] h-[18px]" /></>}
            </button>
            <button
              onClick={back}
              className="w-full text-[13px] font-extrabold mt-4 py-2 text-center"
              style={{ color: "var(--color-muted)" }}
            >
              Back to code entry
            </button>
          </>
        )}
      </div>
    </section>
  );
}
