import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminConsole, type PcGroup, type RetentionRow } from "@/components/AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const meta = user!.app_metadata as { pc_id?: string; division_id?: string };

  // Resolve division: prefer division_id from token, fall back to pc → division.
  let divisionId = meta.division_id ?? "";
  if (!divisionId && meta.pc_id) {
    const { data } = await supabase.from("pcs").select("division_id").eq("id", meta.pc_id).maybeSingle();
    divisionId = (data as { division_id?: string } | null)?.division_id ?? "";
  }

  const { data: division } = await supabase
    .from("divisions")
    .select("id, name")
    .eq("id", divisionId)
    .maybeSingle();
  const divisionName = division?.name ?? "";

  // All PCs in this division
  const { data: pcs } = await supabase
    .from("pcs")
    .select("id, name, pc_code")
    .eq("division_id", divisionId)
    .order("name");

  // All AMs in this division (RLS lets division-admin see all)
  const { data: ams } = await supabase
    .from("account_managers")
    .select("id, full_name, am_code, initials, color, daily_goal, team_label, pc_id")
    .is("archived_at", null)
    .order("am_code");

  const today = new Date().toISOString().slice(0, 10);
  const { data: todaysReports } = await supabase
    .from("daily_reports")
    .select("am_id, acquired, total_opened")
    .eq("report_date", today);

  const reportByAm = new Map((todaysReports ?? []).map((r) => [r.am_id, r]));
  const pcGroups: PcGroup[] = (pcs ?? []).map((pc) => {
    const rows = (ams ?? [])
      .filter((am) => am.pc_id === pc.id)
      .map((am) => {
        const r = reportByAm.get(am.id);
        return {
          id: am.id,
          full_name: am.full_name,
          am_code: am.am_code,
          initials: am.initials,
          color: am.color,
          daily_goal: am.daily_goal,
          team_label: am.team_label ?? null,
          submitted: !!r,
          opened: r?.total_opened ?? null,
        };
      });
    return { pc_id: pc.id, pc_name: pc.name, pc_code: pc.pc_code, rows };
  }).filter((g) => g.rows.length > 0); // hide empty PCs

  const totalCount = pcGroups.reduce((s, g) => s + g.rows.length, 0);
  const submittedCount = pcGroups.reduce((s, g) => s + g.rows.filter((r) => r.submitted).length, 0);
  const totalAcquired = (todaysReports ?? []).reduce((s, r) => s + r.acquired, 0);
  const totalOpened = (todaysReports ?? []).reduce((s, r) => s + r.total_opened, 0);

  // Retention reports today across the division
  const { data: retentionToday } = await supabase
    .from("retention_reports")
    .select("pc_id, pledges_naira_m, inflow_naira_m, outflow_naira_m, retention_naira_m, filled_by_am_id, submitted_at")
    .eq("report_date", today);

  const fillerIds = Array.from(new Set((retentionToday ?? []).map((r) => r.filled_by_am_id)));
  const fillerById = new Map<string, { full_name: string; initials: string; color: string }>();
  if (fillerIds.length > 0) {
    const { data: fillers } = await supabase
      .from("account_managers")
      .select("id, full_name, initials, color")
      .in("id", fillerIds);
    for (const f of fillers ?? []) {
      fillerById.set(f.id, { full_name: f.full_name, initials: f.initials, color: f.color });
    }
  }

  const retentionByPc = new Map((retentionToday ?? []).map((r) => [r.pc_id, r]));
  const retentionRows: RetentionRow[] = (pcs ?? []).map((pc) => {
    const r = retentionByPc.get(pc.id);
    if (!r) {
      return {
        pc_id: pc.id,
        pc_name: pc.name,
        pc_code: pc.pc_code,
        filed: false as const,
      };
    }
    const filler = fillerById.get(r.filled_by_am_id);
    return {
      pc_id: pc.id,
      pc_name: pc.name,
      pc_code: pc.pc_code,
      filed: true as const,
      pledges: Number(r.pledges_naira_m),
      inflow: Number(r.inflow_naira_m),
      outflow: Number(r.outflow_naira_m),
      net: Number(r.retention_naira_m),
      filled_by_name: filler?.full_name ?? "Someone",
      filled_by_initials: filler?.initials ?? "?",
      filled_by_color: filler?.color ?? "#94A3B8",
      submitted_at: r.submitted_at,
    };
  });

  const retentionFiledCount = retentionRows.filter((r) => r.filed).length;
  const retentionTotals = retentionRows.reduce(
    (acc, r) => r.filed
      ? { pledges: acc.pledges + r.pledges, inflow: acc.inflow + r.inflow, outflow: acc.outflow + r.outflow, net: acc.net + r.net }
      : acc,
    { pledges: 0, inflow: 0, outflow: 0, net: 0 },
  );

  const { data: events } = await supabase
    .from("events")
    .select("id, name, location, start_date, end_date, status, created_at")
    .eq("division_id", divisionId)
    .order("created_at", { ascending: false })
    .limit(10);

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

  return (
    <AdminConsole
      divisionName={divisionName}
      pcGroups={pcGroups}
      submittedCount={submittedCount}
      totalCount={totalCount}
      totalAcquired={totalAcquired}
      totalOpened={totalOpened}
      events={eventList}
      retentionRows={retentionRows}
      retentionFiledCount={retentionFiledCount}
      retentionTotals={retentionTotals}
    />
  );
}
