import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportScreen } from "@/components/ReportScreen";
import type { DailyReport } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const meta = user!.app_metadata as { am_id: string };

  const { data: amRow } = await supabase
    .from("account_managers")
    .select("daily_goal")
    .eq("id", meta.am_id)
    .single();

  // Pull last ~60 days of reports — enough for a month + custom range
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const sinceIso = since.toISOString().slice(0, 10);

  const { data: history } = await supabase
    .from("daily_reports")
    .select("id, am_id, report_date, acquired, opened_same_day, total_opened, type_t1, type_t3, type_gt, type_sm, type_sk, submitted_at, edited_at")
    .eq("am_id", meta.am_id)
    .gte("report_date", sinceIso)
    .order("report_date");

  return <ReportScreen history={(history ?? []) as DailyReport[]} goal={amRow?.daily_goal ?? 15} />;
}
