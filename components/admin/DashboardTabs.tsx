"use client";

import { useRouter } from "next/navigation";

export type Tab = "acquisition" | "retention";
export type Slot = "midday" | "eod";

export function DashboardTabs({ tab, slot }: { tab: Tab; slot: Slot }) {
  const router = useRouter();

  function go(nextTab: Tab, nextSlot: Slot) {
    const params = new URLSearchParams();
    params.set("tab", nextTab);
    if (nextTab === "retention") params.set("slot", nextSlot);
    router.push(`/admin?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Top-level tab toggle */}
      <div className="grid grid-cols-2 rounded-xl p-1 max-w-sm" style={{ background: "var(--color-line)" }}>
        <TopTab label="Acquisition" active={tab === "acquisition"} onClick={() => go("acquisition", slot)} />
        <TopTab label="Retention"   active={tab === "retention"}   onClick={() => go("retention", slot)} />
      </div>

      {/* Slot sub-toggle (retention only) */}
      {tab === "retention" && (
        <div className="grid grid-cols-2 rounded-xl p-1 max-w-[260px]" style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)" }}>
          <SlotTab label="12pm" active={slot === "midday"} onClick={() => go("retention", "midday")} />
          <SlotTab label="5pm"  active={slot === "eod"}    onClick={() => go("retention", "eod")} />
        </div>
      )}
    </div>
  );
}

function TopTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-center py-2 rounded-lg font-extrabold text-[13px] transition-colors"
      style={{
        background: active ? "white" : "transparent",
        color: active ? "var(--color-ink)" : "var(--color-muted)",
        boxShadow: active ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
        letterSpacing: "-0.005em",
      }}
    >
      {label}
    </button>
  );
}

function SlotTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-center py-1.5 rounded-lg font-extrabold text-[12px] transition-colors"
      style={{
        background: active ? "var(--color-ink)" : "transparent",
        color: active ? "white" : "var(--color-body)",
        letterSpacing: "-0.005em",
      }}
    >
      {label}
    </button>
  );
}
