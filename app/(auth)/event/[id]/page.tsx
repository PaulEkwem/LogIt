import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EventScreen } from "@/components/EventScreen";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const meta = user.app_metadata as { am_id?: string; role?: string };
  if (meta.role === "admin") redirect(`/admin/events/${id}`);
  if (!meta.am_id) redirect("/");

  const { data: event } = await supabase
    .from("events")
    .select("id, division_id, name, location, start_date, end_date, status, created_by, created_at, closed_at")
    .eq("id", id)
    .single();
  if (!event) notFound();

  // AM sees only their own report — RLS enforces this too, but we query explicitly.
  const { data: ownReport } = await supabase
    .from("event_reports")
    .select("acquired, total_opened, type_t1, type_t3, type_gt, type_sm, type_sk, submitted_at, edited_at")
    .eq("event_id", id)
    .eq("am_id", meta.am_id)
    .maybeSingle();

  return (
    <EventScreen
      event={event}
      ownReport={ownReport ?? null}
      canSubmit={event.status === "active"}
    />
  );
}
