"use client";

import { Plus, X, Store } from "lucide-react";
import type { PosProspect } from "@/lib/types";

export function emptyProspect(): PosProspect {
  return { name: "", business_type: "", min_turnover: 0 };
}

/**
 * Strip prospects that are completely empty (all fields blank/zero).
 * Run on submit so AMs can leave half-filled rows without us complaining.
 */
export function cleanProspects(rows: PosProspect[]): PosProspect[] {
  return rows
    .map((p) => ({
      name: p.name.trim(),
      business_type: p.business_type.trim(),
      min_turnover: Number.isFinite(p.min_turnover) ? Math.max(0, Math.floor(p.min_turnover)) : 0,
    }))
    .filter((p) => p.name || p.business_type || p.min_turnover > 0);
}

/**
 * Validate cleaned prospects — each must have all three fields set.
 * Returns an error message or null if valid.
 */
export function validateProspects(rows: PosProspect[]): string | null {
  for (let i = 0; i < rows.length; i++) {
    const p = rows[i];
    if (!p.name) return `POS prospect ${i + 1}: name required.`;
    if (!p.business_type) return `POS prospect ${i + 1}: business type required.`;
    if (!Number.isFinite(p.min_turnover) || p.min_turnover < 0)
      return `POS prospect ${i + 1}: minimum turnover required.`;
  }
  return null;
}

export function PosProspectStep({
  prospects, onChange, contextLabel = "",
}: {
  prospects: PosProspect[];
  onChange: (next: PosProspect[]) => void;
  contextLabel?: string;
}) {
  function update(i: number, patch: Partial<PosProspect>) {
    onChange(prospects.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function add() {
    onChange([...prospects, emptyProspect()]);
  }
  function remove(i: number) {
    onChange(prospects.filter((_, idx) => idx !== i));
  }

  return (
    <>
      <div className="font-black text-[24px] mb-2" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em", lineHeight: 1.25 }}>
        Any POS prospects{contextLabel ? ` ${contextLabel}` : ""}?
      </div>
      <div className="font-bold text-[13px] mb-6" style={{ color: "var(--color-body)" }}>
        Optional. Add merchants interested in a POS terminal so the team can follow up.
      </div>

      {prospects.length === 0 ? (
        <div
          className="rounded-2xl p-5 flex flex-col items-center gap-3"
          style={{ background: "white", border: "1.5px dashed var(--color-line)" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "#F1F5F9", color: "var(--color-muted)" }}
          >
            <Store className="w-5 h-5" />
          </div>
          <div className="text-center font-bold text-[13px]" style={{ color: "var(--color-muted)" }}>
            No POS prospects added.
          </div>
          <button
            onClick={add}
            className="rounded-xl px-4 py-2.5 font-extrabold text-[13px] inline-flex items-center gap-1.5"
            style={{ background: "var(--color-ink)", color: "white" }}
          >
            <Plus className="w-3.5 h-3.5" /> Add POS prospect
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {prospects.map((p, i) => (
              <div
                key={i}
                className="rounded-2xl p-4"
                style={{ background: "white", border: "1.5px solid var(--color-line)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="inline-flex items-center gap-1.5 font-extrabold text-[10px] uppercase"
                    style={{ color: "var(--color-muted)", letterSpacing: "0.12em" }}
                  >
                    <Store className="w-3 h-3" /> POS prospect {i + 1}
                  </div>
                  <button
                    onClick={() => remove(i)}
                    aria-label="Remove prospect"
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "#F1F5F9", color: "var(--color-ink)" }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <FieldLabel>Name</FieldLabel>
                <input
                  value={p.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="e.g. John's Mart"
                  className="w-full rounded-lg px-3 py-2.5 font-bold text-[14px] outline-none mb-2.5"
                  style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
                />

                <FieldLabel>Business type</FieldLabel>
                <input
                  value={p.business_type}
                  onChange={(e) => update(i, { business_type: e.target.value })}
                  placeholder="e.g. Restaurant, Boutique, Auto parts"
                  className="w-full rounded-lg px-3 py-2.5 font-bold text-[14px] outline-none mb-2.5"
                  style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)", color: "var(--color-ink)" }}
                />

                <FieldLabel>Minimum turnover · ₦ per month</FieldLabel>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 font-extrabold text-[14px] pointer-events-none"
                    style={{ color: "var(--color-muted)" }}
                  >
                    ₦
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1000}
                    value={p.min_turnover === 0 ? "" : p.min_turnover}
                    onChange={(e) => {
                      const v = parseInt(e.target.value.replace(/\D/g, "") || "0", 10);
                      update(i, { min_turnover: Math.max(0, isNaN(v) ? 0 : v) });
                    }}
                    placeholder="500000"
                    className="w-full rounded-lg pl-7 pr-3 py-2.5 font-bold text-[14px] outline-none num"
                    style={{
                      background: "var(--color-bg)",
                      border: "1.5px solid var(--color-line)",
                      color: "var(--color-ink)",
                      MozAppearance: "textfield",
                    }}
                  />
                </div>
                {p.min_turnover > 0 && (
                  <div className="text-right font-bold text-[11px] mt-1" style={{ color: "var(--color-muted)" }}>
                    = {formatNgn(p.min_turnover)}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={add}
            className="w-full mt-3 rounded-xl py-2.5 font-extrabold text-[13px] flex items-center justify-center gap-1.5"
            style={{ background: "white", border: "1.5px dashed var(--color-line)", color: "var(--color-ink)" }}
          >
            <Plus className="w-3.5 h-3.5" /> Add another
          </button>
        </>
      )}
    </>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-extrabold text-[10px] uppercase mb-1.5"
      style={{ color: "var(--color-muted)", letterSpacing: "0.12em" }}
    >
      {children}
    </div>
  );
}

export function formatNgn(n: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);
}
