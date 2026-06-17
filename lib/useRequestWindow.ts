"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CountdownVariant } from "@/components/admin/CountdownOverlay";

type Phase = "idle" | "busy" | "counting";

export type FireArgs = {
  variant: CountdownVariant; // "request" | "close" | "reopen"
  reportType: "acquisition" | "retention";
  slot: "single" | "midday" | "eod";
  label: string; // shown inside the overlay
};

/**
 * Unified client hook for opening / closing / reopening a report window.
 * On success the hook flips to phase = "counting" so the caller can render
 * <CountdownOverlay /> and invoke finish() when the animation completes.
 */
export function useWindowAction() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [active, setActive] = useState<FireArgs | null>(null);

  const fire = useCallback(async (args: FireArgs) => {
    if (phase !== "idle") return;
    setActive(args);
    setPhase("busy");
    try {
      const action = args.variant === "close" ? "close" : "open"; // request + reopen both open
      const res = await fetch("/api/admin/window", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, report_type: args.reportType, slot: args.slot }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Couldn't update the window.");
        setPhase("idle");
        setActive(null);
        return;
      }
      setPhase("counting");
    } catch {
      alert("Couldn't reach the server.");
      setPhase("idle");
      setActive(null);
    }
  }, [phase]);

  const finish = useCallback(() => {
    router.refresh();
    setPhase("idle");
    setActive(null);
  }, [router]);

  return { phase, active, fire, finish };
}

// Backwards-compat alias for callers that imported the old name.
export const useRequestWindow = useWindowAction;
