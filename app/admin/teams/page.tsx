import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TeamManagement, type TeamItem } from "@/components/TeamManagement";
import { AmsList, type FlatAm, type TeamPick } from "@/components/admin/AmsList";
import { TeamsAmsToggle } from "@/components/admin/TeamsAmsToggle";

export const dynamic = "force-dynamic";

type RouteProps = {
  searchParams: Promise<{ view?: string }>;
};

export default async function AdminTeamsPage({ searchParams }: RouteProps) {
  const { view: viewParam } = await searchParams;
  const view: "teams" | "ams" = viewParam === "ams" ? "ams" : "teams";

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const meta = user!.app_metadata as { pc_id?: string; division_id?: string };

  let divisionId = meta.division_id ?? "";
  if (!divisionId && meta.pc_id) {
    const { data } = await supabase.from("pcs").select("division_id").eq("id", meta.pc_id).maybeSingle();
    divisionId = (data as { division_id?: string } | null)?.division_id ?? "";
  }

  const { data: pcsAll } = await supabase
    .from("pcs").select("id, name, pc_code, archived_at").eq("division_id", divisionId).order("name");

  const { data: ams } = await supabase
    .from("account_managers")
    .select("id, full_name, am_code, initials, color, pc_id, archived_at")
    .order("am_code");

  const pcById = new Map((pcsAll ?? []).map((p) => [p.id, p]));

  const activeAms = (ams ?? []).filter((a) => !a.archived_at);
  const amCountByPc = new Map<string, number>();
  for (const am of activeAms) {
    amCountByPc.set(am.pc_id, (amCountByPc.get(am.pc_id) ?? 0) + 1);
  }

  const teams: TeamItem[] = (pcsAll ?? []).map((p) => ({
    pc_id: p.id,
    pc_name: p.name,
    pc_code: p.pc_code,
    am_count: amCountByPc.get(p.id) ?? 0,
    archived: !!p.archived_at,
  }));

  const flatAms: FlatAm[] = (ams ?? []).map((am) => {
    const pc = pcById.get(am.pc_id);
    return {
      id: am.id,
      full_name: am.full_name,
      am_code: am.am_code,
      initials: am.initials,
      color: am.color,
      pc_id: am.pc_id,
      pc_name: pc?.name ?? "—",
      pc_code: pc?.pc_code ?? "—",
      archived: !!am.archived_at,
    };
  });

  const teamPicks: TeamPick[] = (pcsAll ?? [])
    .filter((p) => !p.archived_at)
    .map((p) => ({ id: p.id, name: p.name, pc_code: p.pc_code }));

  return (
    <div className="flex flex-col gap-5">
      <PageHead title="Teams & AMs" sub="Manage everything in one place" />

      <TeamsAmsToggle active={view} />

      {view === "teams" ? (
        <TeamManagement teams={teams} />
      ) : (
        <AmsList ams={flatAms} teams={teamPicks} />
      )}
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
