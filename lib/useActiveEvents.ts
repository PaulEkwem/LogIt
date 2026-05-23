"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Event } from "@/lib/types";

/**
 * Subscribe to active events for the AM's division. Initial fetch + realtime
 * updates so banners appear without refresh when the admin creates a campaign.
 *
 * Pass divisionId from the server (the AM's PC → division). Pass amHasReported
 * to filter the banner display in the component (we still fetch all so the
 * recap link works).
 */
export function useActiveEvents(divisionId: string) {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (!divisionId) return;
    const supabase = createSupabaseBrowserClient();

    let alive = true;

    // Initial fetch.
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("division_id", divisionId)
        .eq("status", "active")
        .order("start_date", { ascending: false });
      if (alive && data) setEvents(data as Event[]);
    })();

    // Live subscription. We re-fetch on any change to keep state simple
    // (handles INSERT, UPDATE, DELETE without per-event reconciliation logic).
    const channel = supabase
      .channel(`division-events-${divisionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `division_id=eq.${divisionId}` },
        async () => {
          const { data } = await supabase
            .from("events")
            .select("*")
            .eq("division_id", divisionId)
            .eq("status", "active")
            .order("start_date", { ascending: false });
          if (alive && data) setEvents(data as Event[]);
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [divisionId]);

  return events;
}
