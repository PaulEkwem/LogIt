import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HomeScreen } from "@/components/HomeScreen";
import { RealtimeWindowRefresh } from "@/components/RealtimeWindowRefresh";
import type { DailyReport } from "@/lib/types";
import { lagosDate, lagosYesterday } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const meta = user!.app_metadata as { am_id: string; pc_id: string };

  const today = lagosDate();

  const [{ data: amRow }, { data: reports }, { data: pcRow }] = await Promise.all([
    supabase.from("account_managers").select("id, full_name, am_code, daily_goal").eq("id", meta.am_id).single(),
    supabase.from("daily_reports").select("id, am_id, report_date, acquired, opened_same_day, total_opened, type_t1, type_t3, type_gt, type_sm, type_sk, submitted_at, edited_at").eq("am_id", meta.am_id).order("report_date", { ascending: false }).limit(2),
    supabase.from("pcs").select("division_id").eq("id", meta.pc_id).single(),
  ]);

  const todayReport = reports?.find((r) => r.report_date === today) ?? null;
  const yesterdayReport = reports?.find((r) => r.report_date !== today) ?? null;
  const divisionId = pcRow?.division_id ?? "";

  // Yesterday team snapshot for the waiting-state card.
  const yesterdayDate = lagosYesterday();
  const { data: teamAms } = await supabase
    .from("account_managers")
    .select("id")
    .eq("pc_id", meta.pc_id)
    .is("archived_at", null);
  const teamAmIds = (teamAms ?? []).map((a) => a.id);

  let yesterdaySnapshot: { meOpened: number; teamFiled: number; teamTotal: number; teamOpened: number } | null = null;
  if (teamAmIds.length > 0) {
    const { data: yReports } = await supabase
      .from("daily_reports")
      .select("am_id, total_opened")
      .eq("report_date", yesterdayDate)
      .in("am_id", teamAmIds);
    if ((yReports ?? []).length > 0) {
      const me = (yReports ?? []).find((r) => r.am_id === meta.am_id);
      yesterdaySnapshot = {
        meOpened: me?.total_opened ?? 0,
        teamFiled: (yReports ?? []).length,
        teamTotal: teamAmIds.length,
        teamOpened: (yReports ?? []).reduce((s, r) => s + r.total_opened, 0),
      };
    }
  }

  // Fetch windows + active retention slot fill status in parallel.
  const [{ data: windows }, { data: retentionToday }] = await Promise.all([
    supabase.from("report_windows")
      .select("report_type, slot, opened_at, closed_at")
      .eq("division_id", divisionId)
      .eq("report_date", today),
    supabase.from("retention_reports")
      .select("slot, filled_by_am_id, submitted_at, retention_naira_m")
      .eq("pc_id", meta.pc_id)
      .eq("report_date", today),
  ]);

  const findOpen = (type: "acquisition" | "retention", slot: string) =>
    (windows ?? []).find((w) => w.report_type === type && w.slot === slot && w.opened_at && !w.closed_at);

  const acquisitionOpen = !!findOpen("acquisition", "single");
  const retentionMiddayOpen = !!findOpen("retention", "midday");
  const retentionEodOpen = !!findOpen("retention", "eod");

  const middayRow = (retentionToday ?? []).find((r) => r.slot === "midday");
  const eodRow    = (retentionToday ?? []).find((r) => r.slot === "eod");

  // Compute fill status per slot (not just the "active" one). Each open slot
  // shows its own banner on the AM home — 12pm and 5pm are independent.
  type SlotStatus = { filled_by_name: string; submitted_at: string; retention_m: number };
  async function resolveStatus(row: typeof middayRow): Promise<SlotStatus | null> {
    if (!row) return null;
    const { data: filler } = await supabase
      .from("account_managers").select("full_name")
      .eq("id", row.filled_by_am_id).maybeSingle();
    return {
      filled_by_name: filler?.full_name ?? "a teammate",
      submitted_at: row.submitted_at,
      retention_m: Number(row.retention_naira_m),
    };
  }
  const [retentionMiddayStatus, retentionEodStatus] = await Promise.all([
    retentionMiddayOpen ? resolveStatus(middayRow) : Promise.resolve(null),
    retentionEodOpen    ? resolveStatus(eodRow)    : Promise.resolve(null),
  ]);

  return (
    <>
    <RealtimeWindowRefresh divisionId={divisionId} />
    <HomeScreen
      amName={amRow?.full_name ?? "Account Manager"}
      goal={amRow?.daily_goal ?? 15}
      today={todayReport as DailyReport | null}
      yesterday={yesterdayReport as DailyReport | null}
      divisionId={divisionId}
      amId={meta.am_id}
      acquisitionOpen={acquisitionOpen}
      retentionMiddayOpen={retentionMiddayOpen}
      retentionEodOpen={retentionEodOpen}
      retentionMiddayStatus={retentionMiddayStatus}
      retentionEodStatus={retentionEodStatus}
      yesterdaySnapshot={yesterdaySnapshot}
    />
    </>
  );
}
