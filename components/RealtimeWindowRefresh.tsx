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

    const channel = supabase
      .channel(`division-windows-${divisionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "report_windows", filter: `division_id=eq.${divisionId}` },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [divisionId, router]);

  return null;
}
