import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TeamManagement, type TeamItem } from "@/components/TeamManagement";
import { AmActionRow, type AdminAmRow } from "@/components/admin/AmActionRow";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
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
    .select("id, full_name, am_code, initials, color, daily_goal, team_label, pc_id, archived_at")
    .order("am_code");

  const today = new Date().toISOString().slice(0, 10);
  const { data: todaysReports } = await supabase
    .from("daily_reports").select("am_id, total_opened").eq("report_date", today);
  const reportByAm = new Map((todaysReports ?? []).map((r) => [r.am_id, r]));

  const activePcs = (pcsAll ?? []).filter((p) => !p.archived_at);
  const activeAms = (ams ?? []).filter((a) => !a.archived_at);

  // Team count uses active AMs (not archived ones)
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

  const totalActive = activeAms.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Teams & AMs" sub="Add, rename, archive, reset PINs" />

      <section>
        <TeamManagement teams={teams} />
      </section>

      <section>
        <SectionTitle>Account Managers · {totalActive}</SectionTitle>
        <div className="flex flex-col gap-3">
          {activePcs.map((pc) => {
            const teamRows: AdminAmRow[] = activeAms
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
            if (teamRows.length === 0) {
              return (
                <div key={pc.id}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-black text-[13px]" style={{ color: "var(--color-ink)" }}>{pc.name}</span>
                    <span className="font-extrabold text-[10px] rounded-md px-1.5 py-0.5" style={{ background: "#F1F5F9", color: "var(--color-muted)", letterSpacing: "0.06em" }}>PC {pc.pc_code}</span>
                  </div>
                  <div className="rounded-2xl px-3 py-3" style={{ background: "white", border: "1.5px dashed var(--color-line)" }}>
                    <div className="text-[12px] font-bold" style={{ color: "var(--color-muted)" }}>
                      No AMs yet. Use <b>Add AM</b> on the team row above to add one.
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div key={pc.id}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-black text-[13px]" style={{ color: "var(--color-ink)" }}>{pc.name}</span>
                  <span className="font-extrabold text-[10px] rounded-md px-1.5 py-0.5" style={{ background: "#F1F5F9", color: "var(--color-muted)", letterSpacing: "0.06em" }}>PC {pc.pc_code}</span>
                </div>
                <div className="rounded-2xl px-3" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
                  {teamRows.map((row, i) => (
                    <AmActionRow key={row.id} row={row} first={i === 0} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-extrabold text-[11px] uppercase mb-2" style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}>
      {children}
    </div>
  );
}
