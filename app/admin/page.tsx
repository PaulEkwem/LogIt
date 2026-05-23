import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminConsole } from "@/components/AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const meta = user!.app_metadata as { pc_id: string };

  const { data: pc } = await supabase
    .from("pcs")
    .select("id, name, pc_code, division_id, division:divisions(id, name)")
    .eq("id", meta.pc_id)
    .single();

  const divisionId = (pc as { division_id?: string } | null)?.division_id ?? "";

  const { data: ams } = await supabase
    .from("account_managers")
    .select("id, full_name, am_code, initials, color, daily_goal")
    .eq("pc_id", meta.pc_id)
    .is("archived_at", null)
    .order("am_code");

  const today = new Date().toISOString().slice(0, 10);
  const { data: todaysReports } = await supabase
    .from("daily_reports")
    .select("am_id, acquired, total_opened")
    .eq("report_date", today);

  const rows = (ams ?? []).map((am) => {
    const r = todaysReports?.find((x) => x.am_id === am.id);
    return {
      ...am,
      submitted: !!r,
      opened: r?.total_opened ?? null,
    };
  });

  const submittedCount = rows.filter((r) => r.submitted).length;
  const totalAcquired = (todaysReports ?? []).reduce((s, r) => s + r.acquired, 0);
  const totalOpened = (todaysReports ?? []).reduce((s, r) => s + r.total_opened, 0);

  // Campaigns
  const { data: events } = await supabase
    .from("events")
    .select("id, name, location, start_date, end_date, status, created_at")
    .eq("division_id", divisionId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Aggregate per active event (admin sees full picture, RLS allows it)
  const eventList = await Promise.all(
    (events ?? []).map(async (ev) => {
      const { data: er } = await supabase
        .from("event_reports")
        .select("acquired, am_id")
        .eq("event_id", ev.id);
      return {
        ...ev,
        total_acquired: (er ?? []).reduce((s, r) => s + r.acquired, 0),
        participants: new Set((er ?? []).map((r) => r.am_id)).size,
      };
    }),
  );

  // @ts-expect-error nested supabase select
  const divisionName = pc?.division?.name ?? "";
  const pcName = pc?.name ?? "";
  const pcCode = pc?.pc_code ?? "";

  return (
    <AdminConsole
      divisionName={divisionName}
      pcName={pcName}
      pcCode={pcCode}
      rows={rows}
      submittedCount={submittedCount}
      totalAcquired={totalAcquired}
      totalOpened={totalOpened}
      events={eventList}
    />
  );
}
