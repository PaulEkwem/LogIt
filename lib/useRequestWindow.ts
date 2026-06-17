"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Phase = "idle" | "busy" | "counting";

export type RequestWindowArgs = {
  reportType: "acquisition" | "retention";
  slot: "single" | "midday" | "eod";
};

/**
 * Shared client hook for opening a report window.
 * Fires POST /api/admin/window, then transitions into a 3-step countdown
 * phase. Caller renders <CountdownOverlay /> while phase === "counting"
 * and passes finish() back via onDone.
 */
export function useRequestWindow() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");

  const request = useCallback(async (args: RequestWindowArgs) => {
    if (phase !== "idle") return;
    setPhase("busy");
    try {
      const res = await fetch("/api/admin/window", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open", report_type: args.reportType, slot: args.slot }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Couldn't open the window.");
        setPhase("idle");
        return;
      }
      setPhase("counting");
    } catch {
      alert("Couldn't reach the server.");
      setPhase("idle");
    }
  }, [phase]);

  const finish = useCallback(() => {
    router.refresh();
    setPhase("idle");
  }, [router]);

  return { phase, request, finish };
}
