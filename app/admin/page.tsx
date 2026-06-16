import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RetentionTable, type RetentionRow, type RetentionTotals } from "@/components/admin/RetentionTable";
import { AmActionRow, type AdminAmRow } from "@/components/admin/AmActionRow";
import Link from "next/link";
import { PlayCircle, Users2, Megaphone, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtToday() {
  const d = new Date();
  return `${d.toLocaleDateString(undefined, { weekday: "long" })}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const meta = user!.app_metadata as { pc_id?: string; division_id?: string };

  let divisionId = meta.division_id ?? "";
  if (!divisionId && meta.pc_id) {
    const { data } = await supabase.from("pcs").select("division_id").eq("id", meta.pc_id).maybeSingle();
    divisionId = (data as { division_id?: string } | null)?.division_id ?? "";
  }

  const { data: division } = await supabase
    .from("divisions").select("name").eq("id", divisionId).maybeSingle();
  const divisionName = division?.name ?? "";

  const { data: pcs } = await supabase
    .from("pcs").select("id, name, pc_code").eq("division_id", divisionId).is("archived_at", null).order("name");

  const { data: ams } = await supabase
    .from("account_managers")
    .select("id, full_name, am_code, initials, color, daily_goal, team_label, pc_id")
    .is("archived_at", null).order("am_code");

  const today = new Date().toISOString().slice(0, 10);
  const { data: todaysReports } = await supabase
    .from("daily_reports").select("am_id, acquired, total_opened").eq("report_date", today);

  const reportByAm = new Map((todaysReports ?? []).map((r) => [r.am_id, r]));
  const totalCount = (ams ?? []).length;
  const submittedCount = (todaysReports ?? []).length;
  const totalAcquired = (todaysReports ?? []).reduce((s, r) => s + r.acquired, 0);
  const totalOpened   = (todaysReports ?? []).reduce((s, r) => s + r.total_opened, 0);

  // Retention rows for both slots
  const { data: retentionToday } = await supabase
    .from("retention_reports")
    .select("pc_id, slot, pledges_naira_m, inflow_naira_m, outflow_naira_m, retention_naira_m, filled_by_am_id, submitted_at")
    .eq("report_date", today);

  const fillerIds = Array.from(new Set((retentionToday ?? []).map((r) => r.filled_by_am_id)));
  const fillerById = new Map<string, { full_name: string; initials: string; color: string }>();
  if (fillerIds.length > 0) {
    const { data: fillers } = await supabase
      .from("account_managers").select("id, full_name, initials, color").in("id", fillerIds);
    for (const f of fillers ?? []) {
      fillerById.set(f.id, { full_name: f.full_name, initials: f.initials, color: f.color });
    }
  }

  function rowsForSlot(slot: "midday" | "eod"): RetentionRow[] {
    const slotRows = (retentionToday ?? []).filter((r) => r.slot === slot);
    const byPc = new Map(slotRows.map((r) => [r.pc_id, r]));
    return (pcs ?? []).map((pc) => {
      const r = byPc.get(pc.id);
      if (!r) {
        return { pc_id: pc.id, pc_name: pc.name, pc_code: pc.pc_code, filed: false as const };
      }
      const filler = fillerById.get(r.filled_by_am_id);
      return {
        pc_id: pc.id, pc_name: pc.name, pc_code: pc.pc_code, filed: true as const,
        pledges: Number(r.pledges_naira_m),
        inflow:  Number(r.inflow_naira_m),
        outflow: Number(r.outflow_naira_m),
        net:     Number(r.retention_naira_m),
        filled_by_name:     filler?.full_name ?? "Someone",
        filled_by_initials: filler?.initials ?? "?",
        filled_by_color:    filler?.color ?? "#94A3B8",
        submitted_at:       r.submitted_at,
      };
    });
  }

  function totalsFor(rows: RetentionRow[]): RetentionTotals {
    return rows.reduce(
      (acc, r) => r.filed
        ? { pledges: acc.pledges + r.pledges, inflow: acc.inflow + r.inflow, outflow: acc.outflow + r.outflow, net: acc.net + r.net }
        : acc,
      { pledges: 0, inflow: 0, outflow: 0, net: 0 },
    );
  }

  const middayRows = rowsForSlot("midday");
  const eodRows    = rowsForSlot("eod");
  const middayFiled = middayRows.filter((r) => r.filed).length;
  const eodFiled    = eodRows.filter((r) => r.filed).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Dashboard" sub={`${divisionName} · ${fmtToday()}`} />

      {/* Hero */}
      <div className="rounded-2xl p-5" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
        <div className="font-extrabold text-[10px] uppercase mb-2" style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}>
          Acquisition today
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <Stat big value={submittedCount} suffix={`/${totalCount}`} label="AMs filed" />
          <Stat value={totalAcquired} label="acquired" />
          <Stat value={totalOpened}   label="opened" />
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickLink href="/admin/windows" icon={<PlayCircle className="w-5 h-5" />} title="Open a report" sub="Acquisition · Retention 12pm · 5pm" />
        <QuickLink href="/admin/teams"   icon={<Users2 className="w-5 h-5" />}     title="Teams & AMs"     sub="Add, rename, archive, reset PIN" />
        <QuickLink href="/admin/campaigns" icon={<Megaphone className="w-5 h-5" />} title="Campaigns"       sub="Cluster marketing events" />
      </div>

      {/* Retention midday */}
      {(retentionToday?.some((r) => r.slot === "midday") || middayFiled > 0) && (
        <section>
          <SectionTitle>Retention 12pm · {middayFiled}/{middayRows.length} filed</SectionTitle>
          <RetentionTable rows={middayRows} totals={totalsFor(middayRows)} />
        </section>
      )}

      {/* Retention EOD */}
      {(retentionToday?.some((r) => r.slot === "eod") || eodFiled > 0) && (
        <section>
          <SectionTitle>Retention 5pm · {eodFiled}/{eodRows.length} filed</SectionTitle>
          <RetentionTable rows={eodRows} totals={totalsFor(eodRows)} />
        </section>
      )}

      {/* AMs by team — read-only on dashboard */}
      <section>
        <SectionTitle>Account Managers · {totalCount}</SectionTitle>
        <div className="flex flex-col gap-3">
          {(pcs ?? []).map((pc) => {
            const teamRows: AdminAmRow[] = (ams ?? [])
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
            if (teamRows.length === 0) return null;
            const subFiled = teamRows.filter((r) => r.submitted).length;
            return (
              <div key={pc.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-[13px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>{pc.name}</span>
                    <span className="font-extrabold text-[10px] rounded-md px-1.5 py-0.5" style={{ background: "#F1F5F9", color: "var(--color-muted)", letterSpacing: "0.06em" }}>
                      PC {pc.pc_code}
                    </span>
                  </div>
                  <span className="font-extrabold text-[12px]" style={{ color: "var(--color-muted)" }}>
                    {subFiled}/{teamRows.length}
                  </span>
                </div>
                <div className="rounded-2xl px-3" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
                  {teamRows.map((row, i) => (
                    <AmActionRow key={row.id} row={row} first={i === 0} showActions={false} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-center">
          <Link href="/admin/teams" className="font-extrabold text-[12px] inline-flex items-center gap-1" style={{ color: "var(--color-brand-red)" }}>
            Manage teams & AMs <ArrowRight className="w-3 h-3" />
          </Link>
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

function Stat({ value, suffix, label, big = false }: { value: number; suffix?: string; label: string; big?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="num font-black" style={{ fontSize: big ? 38 : 22, lineHeight: 1, color: "var(--color-ink)", letterSpacing: "-0.04em" }}>
        {value}{suffix}
      </span>
      <span className="font-bold text-[12px]" style={{ color: "var(--color-muted)" }}>{label}</span>
    </div>
  );
}

function QuickLink({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link href={href} className="rounded-2xl p-4 flex items-center gap-3 transition-transform active:scale-[0.99]" style={{ background: "white", border: "1.5px solid var(--color-line)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(206,17,38,0.08)", color: "var(--color-brand-red)" }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-black text-[13px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>{title}</div>
        <div className="font-bold text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>{sub}</div>
      </div>
      <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-muted)" }} />
    </Link>
  );
}
