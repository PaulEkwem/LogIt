"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Subscribe to report_windows changes for the AM's division. On any insert
 * or update, refresh the current page so the live banner / waiting state
 * flips instantly when admin opens or closes a window.
 *
 * Render as a sibling on the AM home page (server component). No UI.
 */
export function RealtimeWindowRefresh({ divisionId }: { divisionId: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!divisionId) return;
    const supabase = createSupabaseBrowserClient();

    const channelName = `division-windows-${divisionId}`;
    console.log("[realtime-windows] subscribing", { divisionId, channelName });

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "report_windows", filter: `division_id=eq.${divisionId}` },
        (payload) => {
          console.log("[realtime-windows] change received", payload);
          router.refresh();
        },
      )
      .subscribe((status, err) => {
        console.log("[realtime-windows] subscription status:", status, err ?? "");
      });

    return () => {
      console.log("[realtime-windows] unsubscribing");
      supabase.removeChannel(channel);
    };
  }, [divisionId, router]);

  return null;
}
