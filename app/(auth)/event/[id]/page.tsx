import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EventScreen } from "@/components/EventScreen";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const meta = user.app_metadata as { am_id?: string; role?: string; pc_id?: string };

  const { data: event } = await supabase
    .from("events")
    .select("id, division_id, name, location, start_date, end_date, status, created_by, created_at, closed_at")
    .eq("id", id)
    .single();
  if (!event) notFound();

  // AM's own report for this event (if any)
  let ownReport = null;
  if (meta.am_id) {
    const { data } = await supabase
      .from("event_reports")
      .select("acquired, type_t1, type_t3, type_gt, type_sm, type_sk, submitted_at, edited_at")
      .eq("event_id", id)
      .eq("am_id", meta.am_id)
      .maybeSingle();
    ownReport = data ?? null;
  }

  // Own-PC reports (RLS scopes this) — for the "Your PC" breakdown
  const { data: pcReports } = await supabase
    .from("event_reports")
    .select("am_id, acquired, am:account_managers(full_name, initials, color)")
    .eq("event_id", id);

  // Division-wide aggregate via RPC (returns totals only, no row-level leak)
  const { data: aggRows } = await supabase.rpc("event_division_aggregate", { target_event_id: id });
  const agg = aggRows?.[0] ?? { total_acquired: 0, total_participants: 0 };

  return (
    <EventScreen
      event={event}
      ownReport={ownReport}
      pcReports={(pcReports ?? []) as unknown as PcReportRow[]}
      divisionAgg={agg}
      canSubmit={!!meta.am_id && event.status === "active"}
    />
  );
}

type PcReportRow = {
  am_id: string;
  acquired: number;
  am: { full_name: string; initials: string; color: string };
};
