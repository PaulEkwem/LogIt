"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function EmptyTodayCta({
  reportType, slot, label,
}: {
  reportType: "acquisition" | "retention";
  slot: "single" | "midday" | "eod";
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function request() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/window", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open", report_type: reportType, slot }),
      });
      const data = await res.json();
      if (res.ok) {
        router.refresh();
      } else {
        alert(data.error ?? "Couldn't open the window.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl p-8 flex flex-col items-center text-center" style={{ background: "white", border: "1.5px dashed var(--color-line)" }}>
      <div className="text-[36px] mb-2" aria-hidden>📭</div>
      <div className="font-black text-[16px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.015em" }}>
        Nothing live yet for today
      </div>
      <div className="font-bold text-[12px] mt-1 max-w-[360px]" style={{ color: "var(--color-body)", lineHeight: 1.55 }}>
        AMs are waiting on you. Tap below to send the request — they&apos;ll see it on their home screen immediately.
      </div>
      <button
        onClick={request}
        disabled={busy}
        className="mt-5 rounded-2xl py-3 px-5 font-black text-[14px] flex items-center justify-center gap-2 text-white disabled:opacity-50 transition-transform active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg, var(--color-brand-red), var(--color-brand-red-d))", letterSpacing: "-0.01em" }}
      >
        <Plus className="w-[18px] h-[18px]" strokeWidth={2.5} /> {busy ? "Requesting…" : label}
      </button>
    </div>
  );
}
