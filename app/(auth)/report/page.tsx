import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportScreen } from "@/components/ReportScreen";
import type { DailyReport } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const meta = user!.app_metadata as { am_id: string };

  const since = new Date();
  since.setDate(since.getDate() - 60);
  const sinceIso = since.toISOString().slice(0, 10);

  const [{ data: amRow }, { data: history }, { data: myCampaigns }] = await Promise.all([
    supabase
      .from("account_managers")
      .select("daily_goal")
      .eq("id", meta.am_id)
      .single(),
    supabase
      .from("daily_reports")
      .select("id, am_id, report_date, acquired, opened_same_day, total_opened, type_t1, type_t3, type_gt, type_sm, type_sk, submitted_at, edited_at")
      .eq("am_id", meta.am_id)
      .gte("report_date", sinceIso)
      .order("report_date"),
    supabase
      .from("event_reports")
      .select("acquired, total_opened, event:events(id, name, location, start_date, status)")
      .eq("am_id", meta.am_id)
      .order("submitted_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <ReportScreen
      history={(history ?? []) as DailyReport[]}
      goal={amRow?.daily_goal ?? 15}
      myCampaigns={(myCampaigns ?? []).map((r) => {
        // @ts-expect-error supabase nested select
        const ev = r.event as { id: string; name: string; location: string; start_date: string; status: string };
        return {
          event_id: ev.id,
          name: ev.name,
          location: ev.location,
          date: ev.start_date,
          status: ev.status,
          acquired: r.acquired,
          opened: r.total_opened,
        };
      })}
    />
  );
}
