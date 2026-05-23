"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Banknote, Users, Target, Check, ArrowRight, Sparkles } from "lucide-react";

type ActiveStatus = "pending" | "logged";

export function ReportTypeSheet({
  open, onClose,
  acquisitionStatus, acquisitionSummary,
}: {
  open: boolean;
  onClose: () => void;
  acquisitionStatus: ActiveStatus;
  acquisitionSummary?: string;       // e.g. "12 opened · logged 14:22"
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
    onClose();
    router.push("/log");
  }

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 z-[300] transition-opacity duration-200"
        style={{
          background: "rgba(15,23,42,0.5)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />

      <div
        role="dialog"
        aria-label="Choose report type"
        className="fixed z-[301] w-full max-w-[430px] transition-transform duration-300 ease-out"
        style={{
          bottom: 0,
          left: 0,
          right: 0,
          marginInline: "auto",
          transform: open ? "translateY(0)" : "translateY(100%)",
          background: "var(--color-bg)",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -8px 32px rgba(15,23,42,0.18)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
        }}
      >
        <div
          onClick={onClose}
          className="flex justify-center pt-3 pb-2 cursor-pointer"
          aria-label="Close"
        >
          <div className="w-10 h-1 rounded-full" style={{ background: "#CBD5E1" }} />
        </div>

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-4 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.06)", color: "var(--color-ink)" }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-5 pt-2 pb-2">
          <div
            className="font-extrabold text-[11px] uppercase mb-1"
            style={{ color: "var(--color-muted)", letterSpacing: "0.18em" }}
          >
            What do you want to log?
          </div>
          <div className="font-black text-[18px] mb-5" style={{ color: "var(--color-ink)", letterSpacing: "-0.02em" }}>
            Choose a report type
          </div>

          {/* Active types */}
          <button
            onClick={pickAcquisition}
            className="w-full text-left rounded-2xl p-3.5 flex items-center gap-3 transition-colors active:scale-[0.99]"
            style={{ background: "white", border: "1.5px solid var(--color-line)" }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(206,17,38,0.08)", color: "var(--color-brand-red)" }}
            >
              <Banknote className="w-5 h-5" strokeWidth={2.25} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-[15px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.015em" }}>
                Customer Acquisition
              </div>
              {acquisitionStatus === "logged" && acquisitionSummary ? (
                <div className="inline-flex items-center gap-1 font-bold text-[12px] mt-0.5" style={{ color: "var(--color-funded)" }}>
                  <Check className="w-3 h-3" strokeWidth={3} /> Logged — {acquisitionSummary} · tap to edit
                </div>
              ) : (
                <div className="font-bold text-[12px] mt-0.5" style={{ color: "var(--color-body)" }}>
                  Account opening — pending today
                </div>
              )}
            </div>
            <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-muted)" }} />
          </button>

          {/* Coming soon */}
          <div
            className="font-extrabold text-[10px] uppercase mt-5 mb-2 px-1"
            style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}
          >
            Coming soon
          </div>
          <div className="flex flex-col gap-2">
            <PlaceholderRow icon={<Users className="w-5 h-5" />} title="Customer Retention" tagline="Track follow-ups and at-risk accounts" />
            <PlaceholderRow icon={<Target className="w-5 h-5" />} title="Cross-selling" tagline="Log products offered and taken" />
          </div>

          <div
            className="text-center mt-5 text-[11px] font-bold"
            style={{ color: "var(--color-muted)", letterSpacing: "0.01em" }}
          >
            <Sparkles className="inline w-3 h-3 mr-1" />
            Your admin will enable more report types as they roll out.
          </div>
        </div>
      </div>
    </>
  );
}

function PlaceholderRow({ icon, title, tagline }: { icon: React.ReactNode; title: string; tagline: string }) {
  return (
    <div
      className="rounded-2xl p-3.5 flex items-center gap-3"
      style={{ background: "white", border: "1.5px dashed var(--color-line)", opacity: 0.6 }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "#F1F5F9", color: "var(--color-muted)" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-black text-[14px]" style={{ color: "var(--color-muted)", letterSpacing: "-0.015em" }}>
          {title}
        </div>
        <div className="font-bold text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
          {tagline}
        </div>
      </div>
    </div>
  );
}
