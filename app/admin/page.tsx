import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WindowTile, type WindowState } from "@/components/admin/WindowTile";
import { AcquisitionLive, type AmEntry } from "@/components/admin/AcquisitionLive";
import { RetentionLive, type TeamEntry } from "@/components/admin/RetentionLive";
import { DashboardTabs, type Tab, type Slot } from "@/components/admin/DashboardTabs";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtToday() {
  const d = new Date();
  return `${d.toLocaleDateString(undefined, { weekday: "long" })}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

type RouteProps = {
  searchParams: Promise<{ tab?: string; slot?: string }>;
};

export default async function AdminDashboard({ searchParams }: RouteProps) {
  const params = await searchParams;
  const tab: Tab = params.tab === "retention" ? "retention" : "acquisition";
  const slot: Slot = params.slot === "eod" ? "eod" : "midday";

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

  const today = new Date().toISOString().slice(0, 10);

  // Always need PCs (for retention) and AMs (for acquisition). Fetch in parallel
  // with the type-specific data so we keep this snappy.
  const [{ data: pcs }, { data: ams }, { data: windows }] = await Promise.all([
    supabase.from("pcs").select("id, name, pc_code").eq("division_id", divisionId).is("archived_at", null).order("name"),
    supabase.from("account_managers").select("id, full_name, am_code, initials, color, pc_id").is("archived_at", null),
    supabase.from("report_windows")
      .select("report_type, slot, opened_at, closed_at, closed_reason")
      .eq("division_id", divisionId).eq("report_date", today),
  ]);

  const totalPcs = (pcs ?? []).length;
  const totalAms = (ams ?? []).length;
  const pcById = new Map((pcs ?? []).map((p) => [p.id, p]));

  const findWindow = (type: "acquisition" | "retention", s: string) =>
    (windows ?? []).find((w) => w.report_type === type && w.slot === s);

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Dashboard" sub={`${divisionName} · ${fmtToday()}`} />

      <DashboardTabs tab={tab} slot={slot} />

      {tab === "acquisition" ? (
        <AcquisitionPanel
          supabase={supabase}
          ams={ams ?? []}
          totalAms={totalAms}
          pcById={pcById}
          today={today}
          window={findWindow("acquisition", "single")}
        />
      ) : (
        <RetentionPanel
          supabase={supabase}
          pcs={pcs ?? []}
          totalPcs={totalPcs}
          today={today}
          slot={slot}
          window={findWindow("retention", slot)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Acquisition panel
// ============================================================================

type WindowRow = { report_type: string; slot: string; opened_at: string | null; closed_at: string | null; closed_reason: string | null } | undefined;

async function AcquisitionPanel({
  supabase, ams, totalAms, pcById, today, window,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  ams: { id: string; full_name: string; am_code: string; initials: string; color: string; pc_id: string }[];
  totalAms: number;
  pcById: Map<string, { id: string; name: string; pc_code: string }>;
  today: string;
  window: WindowRow;
}) {
  const { data: todaysReports } = await supabase
    .from("daily_reports").select("am_id, acquired, total_opened, opened_same_day, submitted_at").eq("report_date", today);

  const reportByAm = new Map((todaysReports ?? []).map((r) => [r.am_id, r]));
  const entries: AmEntry[] = ams.map((am) => {
    const r = reportByAm.get(am.id);
    const pc = pcById.get(am.pc_id);
    const acquired = r?.acquired ?? 0;
    const opened = r?.total_opened ?? 0;
    const sameDay = r?.opened_same_day ?? 0;
    const conv = acquired > 0 ? Math.round((sameDay / acquired) * 100) : 0;
    return {
      id: am.id, full_name: am.full_name, am_code: am.am_code,
      initials: am.initials, color: am.color, pc_name: pc?.name ?? "",
      filed: !!r, acquired, opened, conv,
      submitted_at: r?.submitted_at ?? null,
    };
  });
  const state: WindowState = {
    opened_at: window?.opened_at ?? null,
    closed_at: window?.closed_at ?? null,
    filed: (todaysReports ?? []).length,
    total: totalAms,
  };
  const live = !!state.opened_at && !state.closed_at;

  return (
    <section className="flex flex-col gap-4">
      <WindowTile
        label="Customer acquisition"
        sublabel="One filing per AM, throughout the day"
        reportType="acquisition"
        slot="single"
        state={state}
        downloadHref={null}
      />
      {live && <AcquisitionLive entries={entries} />}
    </section>
  );
}

// ============================================================================
// Retention panel
// ============================================================================

async function RetentionPanel({
  supabase, pcs, totalPcs, today, slot, window,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  pcs: { id: string; name: string; pc_code: string }[];
  totalPcs: number;
  today: string;
  slot: Slot;
  window: WindowRow;
}) {
  const { data: rows } = await supabase
    .from("retention_reports")
    .select("pc_id, pledges_naira_m, inflow_naira_m, outflow_naira_m, retention_naira_m, filled_by_am_id, submitted_at")
    .eq("report_date", today)
    .eq("slot", slot);

  const fillerIds = Array.from(new Set((rows ?? []).map((r) => r.filled_by_am_id)));
  const fillerById = new Map<string, { full_name: string; initials: string; color: string }>();
  if (fillerIds.length > 0) {
    const { data: fillers } = await supabase
      .from("account_managers").select("id, full_name, initials, color").in("id", fillerIds);
    for (const f of fillers ?? []) {
      fillerById.set(f.id, { full_name: f.full_name, initials: f.initials, color: f.color });
    }
  }

  const byPc = new Map((rows ?? []).map((r) => [r.pc_id, r]));
  const entries: TeamEntry[] = pcs.map((pc) => {
    const r = byPc.get(pc.id);
    if (!r) {
      return {
        pc_id: pc.id, pc_name: pc.name, pc_code: pc.pc_code, filed: false,
        pledges: 0, inflow: 0, outflow: 0, net: 0,
        filled_by_name: null, filled_by_initials: null, filled_by_color: null,
        submitted_at: null,
      };
    }
    const f = fillerById.get(r.filled_by_am_id);
    return {
      pc_id: pc.id, pc_name: pc.name, pc_code: pc.pc_code, filed: true,
      pledges: Number(r.pledges_naira_m),
      inflow:  Number(r.inflow_naira_m),
      outflow: Number(r.outflow_naira_m),
      net:     Number(r.retention_naira_m),
      filled_by_name:     f?.full_name ?? null,
      filled_by_initials: f?.initials ?? null,
      filled_by_color:    f?.color ?? null,
      submitted_at: r.submitted_at,
    };
  });

  const state: WindowState = {
    opened_at: window?.opened_at ?? null,
    closed_at: window?.closed_at ?? null,
    filed: entries.filter((e) => e.filed).length,
    total: totalPcs,
  };
  const live = !!state.opened_at && !state.closed_at;
  const slotLabel = slot === "eod" ? "5pm" : "12pm";

  return (
    <section className="flex flex-col gap-4">
      <WindowTile
        label={`Retention · ${slotLabel}`}
        sublabel={slot === "eod" ? "End of day snapshot — one per team" : "Midday snapshot — one per team"}
        reportType="retention"
        slot={slot}
        state={state}
        downloadHref={`/admin/retention/export/${slot}`}
      />
      {live && <RetentionLive entries={entries} />}
    </section>
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
