import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Leaderboard } from "@/components/Leaderboard";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const meta = user!.app_metadata as { am_id: string; pc_id: string };

  const today = new Date().toISOString().slice(0, 10);

  const { data: ams } = await supabase
    .from("account_managers")
    .select("id, full_name, am_code, initials, color, daily_goal")
    .eq("pc_id", meta.pc_id)
    .is("archived_at", null)
    .order("am_code");

  const { data: reports } = await supabase
    .from("daily_reports")
    .select("am_id, acquired, opened_same_day, total_opened")
    .eq("report_date", today);

  const rows = (ams ?? []).map((am) => {
    const r = reports?.find((x) => x.am_id === am.id);
    const conv =
      r && r.acquired > 0 ? Math.round(((r.opened_same_day ?? 0) / r.acquired) * 100) : 0;
    return {
      ...am,
      opened: r?.total_opened ?? 0,
      acquired: r?.acquired ?? 0,
      conv,
      isMe: am.id === meta.am_id,
    };
  });
  rows.sort((a, b) => b.opened - a.opened || b.conv - a.conv);

  const teamTotalOpened = rows.reduce((s, r) => s + r.opened, 0);
  const teamTotalAcquired = rows.reduce((s, r) => s + r.acquired, 0);
  const teamConv = teamTotalAcquired > 0 ? Math.round((rows.reduce((s, r) => s + Math.min(r.acquired, r.opened), 0) / teamTotalAcquired) * 100) : 0;
  const myRank = rows.findIndex((r) => r.isMe) + 1;

  return (
    <Leaderboard
      rows={rows}
      teamCount={rows.length}
      teamTotalOpened={teamTotalOpened}
      teamTotalAcquired={teamTotalAcquired}
      teamConv={teamConv}
      myRank={myRank}
    />
  );
}
