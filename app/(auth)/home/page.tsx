import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HomeScreen } from "@/components/HomeScreen";
import type { DailyReport } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const meta = user!.app_metadata as { am_id: string };

  const today = new Date().toISOString().slice(0, 10);

  const { data: amRow } = await supabase
    .from("account_managers")
    .select("id, full_name, am_code, daily_goal")
    .eq("id", meta.am_id)
    .single();

  const { data: reports } = await supabase
    .from("daily_reports")
    .select("id, am_id, report_date, acquired, opened_same_day, total_opened, type_t1, type_t3, type_gt, type_sm, type_sk, submitted_at, edited_at")
    .eq("am_id", meta.am_id)
    .order("report_date", { ascending: false })
    .limit(2);

  const todayReport = reports?.find((r) => r.report_date === today) ?? null;
  const yesterdayReport = reports?.find((r) => r.report_date !== today) ?? null;

  return (
    <HomeScreen
      amName={amRow?.full_name ?? "Account Manager"}
      goal={amRow?.daily_goal ?? 15}
      today={todayReport as DailyReport | null}
      yesterday={yesterdayReport as DailyReport | null}
    />
  );
}
