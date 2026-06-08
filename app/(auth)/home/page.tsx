import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HomeScreen } from "@/components/HomeScreen";
import type { DailyReport } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const meta = user!.app_metadata as { am_id: string; pc_id: string };

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: amRow }, { data: reports }, { data: pcRow }, { data: retentionRow }] = await Promise.all([
    supabase
      .from("account_managers")
      .select("id, full_name, am_code, daily_goal")
      .eq("id", meta.am_id)
      .single(),
    supabase
      .from("daily_reports")
      .select("id, am_id, report_date, acquired, opened_same_day, total_opened, type_t1, type_t3, type_gt, type_sm, type_sk, submitted_at, edited_at")
      .eq("am_id", meta.am_id)
      .order("report_date", { ascending: false })
      .limit(2),
    supabase.from("pcs").select("division_id").eq("id", meta.pc_id).single(),
    supabase
      .from("retention_reports")
      .select("retention_naira_m, filled_by_am_id, submitted_at")
      .eq("pc_id", meta.pc_id)
      .eq("report_date", today)
      .maybeSingle(),
  ]);

  const todayReport = reports?.find((r) => r.report_date === today) ?? null;
  const yesterdayReport = reports?.find((r) => r.report_date !== today) ?? null;

  let retentionStatus: { filled_by_name: string; submitted_at: string; retention_m: number } | null = null;
  if (retentionRow) {
    const { data: filler } = await supabase
      .from("account_managers")
      .select("full_name")
      .eq("id", retentionRow.filled_by_am_id)
      .maybeSingle();
    retentionStatus = {
      filled_by_name: filler?.full_name ?? "a teammate",
      submitted_at: retentionRow.submitted_at,
      retention_m: Number(retentionRow.retention_naira_m),
    };
  }

  return (
    <HomeScreen
      amName={amRow?.full_name ?? "Account Manager"}
      goal={amRow?.daily_goal ?? 15}
      today={todayReport as DailyReport | null}
      yesterday={yesterdayReport as DailyReport | null}
      divisionId={pcRow?.division_id ?? ""}
      amId={meta.am_id}
      retentionStatus={retentionStatus}
    />
  );
}
