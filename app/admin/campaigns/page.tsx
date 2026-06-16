import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CampaignManagement, type EventRow } from "@/components/admin/CampaignManagement";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const meta = user!.app_metadata as { pc_id?: string; division_id?: string };

  let divisionId = meta.division_id ?? "";
  if (!divisionId && meta.pc_id) {
    const { data } = await supabase.from("pcs").select("division_id").eq("id", meta.pc_id).maybeSingle();
    divisionId = (data as { division_id?: string } | null)?.division_id ?? "";
  }

  const { data: events } = await supabase
    .from("events")
    .select("id, name, location, start_date, end_date, status, created_at")
    .eq("division_id", divisionId)
    .order("created_at", { ascending: false })
    .limit(30);

  const eventList: EventRow[] = await Promise.all(
    (events ?? []).map(async (ev) => {
      const { data: er } = await supabase
        .from("event_reports").select("acquired, am_id").eq("event_id", ev.id);
      return {
        ...ev,
        total_acquired: (er ?? []).reduce((s, r) => s + r.acquired, 0),
        participants: new Set((er ?? []).map((r) => r.am_id)).size,
      };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Campaigns" sub="Cluster marketing events" />
      <CampaignManagement events={eventList} />
    </div>
  );
}

function PageHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <div className="font-extrabold text-[11px] uppercase" style={{ color: "var(--color-muted)", letterSpacing: "0.18em" }}>
        {sub}
      </div>
      <h1 className="font-black text-[28px] mt-1.5" style={{ color: "var(--color-ink)", letterSpacing: "-0.03em" }}>
        {title}
      </h1>
    </div>
  );
}
