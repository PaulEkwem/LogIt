"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Banknote, ShieldCheck, Target, Check, ArrowRight, Sparkles, Lock } from "lucide-react";

type ActiveStatus = "pending" | "logged";

export function ReportTypeSheet({
  open, onClose,
  acquisitionStatus, acquisitionSummary, acquisitionOpen,
  retentionStatus, retentionSummary, activeRetentionSlot,
}: {
  open: boolean;
  onClose: () => void;
  acquisitionStatus: ActiveStatus;
  acquisitionSummary?: string;
  acquisitionOpen: boolean;
  retentionStatus: ActiveStatus;
  retentionSummary?: string;
  activeRetentionSlot: "midday" | "eod" | null;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  function pickAcquisition() {
    if (!acquisitionOpen) return;
    onClose();
    router.push("/log");
  }

  function pickRetention() {
    if (!activeRetentionSlot) return;
    onClose();
    router.push("/retention");
  }

  const retentionSlotLabel = activeRetentionSlot === "eod" ? "5pm slot" : activeRetentionSlot === "midday" ? "12pm slot" : null;

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 z-[300] transition-opacity duration-200"
        style={{ background: "rgba(15,23,42,0.5)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
      />

      <div
        role="dialog"
        aria-label="Choose report type"
        className="fixed z-[301] w-full max-w-[430px] transition-transform duration-300 ease-out"
        style={{
          bottom: 0, left: 0, right: 0,
          marginInline: "auto",
          transform: open ? "translateY(0)" : "translateY(100%)",
          background: "var(--color-bg)",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -8px 32px rgba(15,23,42,0.18)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
        }}
      >
        <div onClick={onClose} className="flex justify-center pt-3 pb-2 cursor-pointer" aria-label="Close">
          <div className="w-10 h-1 rounded-full" style={{ background: "#CBD5E1" }} />
        </div>

        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-4 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(15,23,42,0.06)", color: "var(--color-ink)" }}>
          <X className="w-4 h-4" />
        </button>

        <div className="px-5 pt-2 pb-2">
          <div className="font-extrabold text-[11px] uppercase mb-1" style={{ color: "var(--color-muted)", letterSpacing: "0.18em" }}>
            What do you want to log?
          </div>
          <div className="font-black text-[18px] mb-5" style={{ color: "var(--color-ink)", letterSpacing: "-0.02em" }}>
            Choose a report type
          </div>

          {/* Acquisition */}
          <ReportRow
            disabled={!acquisitionOpen}
            onClick={pickAcquisition}
            iconBg="rgba(206,17,38,0.08)"
            iconColor="var(--color-brand-red)"
            icon={<Banknote className="w-5 h-5" strokeWidth={2.25} />}
            title="Customer Acquisition"
            status={
              !acquisitionOpen ? "locked" :
              acquisitionStatus === "logged" && acquisitionSummary ? "logged" : "pending"
            }
            summary={acquisitionSummary}
            pendingCopy="Account opening — pending today"
          />

          {/* Retention */}
          <div className="mt-2">
            <ReportRow
              disabled={!activeRetentionSlot}
              onClick={pickRetention}
              iconBg="rgba(15,23,42,0.08)"
              iconColor="var(--color-ink)"
              icon={<ShieldCheck className="w-5 h-5" strokeWidth={2.25} />}
              title={retentionSlotLabel ? `Retention · ${retentionSlotLabel}` : "Retention (team)"}
              status={
                !activeRetentionSlot ? "locked" :
                retentionStatus === "logged" && retentionSummary ? "logged" : "pending"
              }
              summary={retentionSummary}
              pendingCopy="Pledges, inflow, outflow — one per team"
            />
          </div>

          {/* Coming soon */}
          <div className="font-extrabold text-[10px] uppercase mt-5 mb-2 px-1" style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}>
            Coming soon
          </div>
          <div className="flex flex-col gap-2">
            <PlaceholderRow icon={<Target className="w-5 h-5" />} title="Cross-selling" tagline="Log products offered and taken" />
          </div>

          <div className="text-center mt-5 text-[11px] font-bold" style={{ color: "var(--color-muted)", letterSpacing: "0.01em" }}>
            <Sparkles className="inline w-3 h-3 mr-1" />
            Your admin opens each report type at its scheduled time.
          </div>
        </div>
      </div>
    </>
  );
}

function ReportRow({
  disabled, onClick, iconBg, iconColor, icon, title, status, summary, pendingCopy,
}: {
  disabled: boolean;
  onClick: () => void;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  title: string;
  status: "locked" | "logged" | "pending";
  summary?: string;
  pendingCopy: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left rounded-2xl p-3.5 flex items-center gap-3 transition-colors active:scale-[0.99] disabled:active:scale-100"
      style={{
        background: "white",
        border: disabled ? "1.5px dashed var(--color-line)" : "1.5px solid var(--color-line)",
        opacity: disabled ? 0.65 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: disabled ? "#F1F5F9" : iconBg, color: disabled ? "var(--color-muted)" : iconColor }}>
        {disabled ? <Lock className="w-5 h-5" strokeWidth={2.25} /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-black text-[15px]" style={{ color: disabled ? "var(--color-muted)" : "var(--color-ink)", letterSpacing: "-0.015em" }}>
          {title}
        </div>
        {status === "logged" && summary ? (
          <div className="inline-flex items-center gap-1 font-bold text-[12px] mt-0.5" style={{ color: "var(--color-funded)" }}>
            <Check className="w-3 h-3" strokeWidth={3} /> Logged — {summary} · tap to edit
          </div>
        ) : status === "locked" ? (
          <div className="font-bold text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
            Waiting for Blessing to open it
          </div>
        ) : (
          <div className="font-bold text-[12px] mt-0.5" style={{ color: "var(--color-body)" }}>
            {pendingCopy}
          </div>
        )}
      </div>
      {!disabled && <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-muted)" }} />}
    </button>
  );
}

function PlaceholderRow({ icon, title, tagline }: { icon: React.ReactNode; title: string; tagline: string }) {
  return (
    <div className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background: "white", border: "1.5px dashed var(--color-line)", opacity: 0.6 }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#F1F5F9", color: "var(--color-muted)" }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-black text-[14px]" style={{ color: "var(--color-muted)", letterSpacing: "-0.015em" }}>{title}</div>
        <div className="font-bold text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>{tagline}</div>
      </div>
    </div>
  );
}
