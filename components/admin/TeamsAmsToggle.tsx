"use client";

import Link from "next/link";

export function TeamsAmsToggle({ active }: { active: "teams" | "ams" }) {
  return (
    <div
      className="grid grid-cols-2 rounded-xl p-1 max-w-sm"
      style={{ background: "var(--color-line)" }}
    >
      <Tab href="/admin/teams?view=teams" label="Teams" active={active === "teams"} />
      <Tab href="/admin/teams?view=ams"   label="AMs"   active={active === "ams"} />
    </div>
  );
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="text-center py-2 rounded-lg font-extrabold text-[13px] transition-colors"
      style={{
        background: active ? "white" : "transparent",
        color: active ? "var(--color-ink)" : "var(--color-muted)",
        boxShadow: active ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
        letterSpacing: "-0.005em",
      }}
    >
      {label}
    </Link>
  );
}
