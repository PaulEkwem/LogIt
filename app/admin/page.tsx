import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WindowTile, type WindowState } from "@/components/admin/WindowTile";
import { AcquisitionLive, type AmEntry } from "@/components/admin/AcquisitionLive";
import { RetentionLive, type TeamEntry } from "@/components/admin/RetentionLive";

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

  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: pcs },
    { data: ams },
    { data: todaysReports },
    { data: retentionToday },
    { data: windows },
  ] = await Promise.all([
    supabase.from("pcs").select("id, name, pc_code").eq("division_id", divisionId).is("archived_at", null).order("name"),
    supabase.from("account_managers")
      .select("id, full_name, am_code, initials, color, pc_id")
      .is("archived_at", null),
    supabase.from("daily_reports").select("am_id, acquired, total_opened, opened_same_day, submitted_at").eq("report_date", today),
    supabase.from("retention_reports")
      .select("pc_id, slot, pledges_naira_m, inflow_naira_m, outflow_naira_m, retention_naira_m, filled_by_am_id, submitted_at")
      .eq("report_date", today),
    supabase.from("report_windows")
      .select("report_type, slot, opened_at, closed_at, closed_reason")
      .eq("division_id", divisionId).eq("report_date", today),
  ]);

  const pcById = new Map((pcs ?? []).map((p) => [p.id, p]));
  const totalPcs = (pcs ?? []).length;

  const findWindow = (type: "acquisition" | "retention", slot: string) =>
    (windows ?? []).find((w) => w.report_type === type && w.slot === slot);

  // Acquisition
  const reportByAm = new Map((todaysReports ?? []).map((r) => [r.am_id, r]));
  const totalAms = (ams ?? []).length;
  const acquisitionEntries: AmEntry[] = (ams ?? []).map((am) => {
    const r = reportByAm.get(am.id);
    const pc = pcById.get(am.pc_id);
    const acquired = r?.acquired ?? 0;
    const opened = r?.total_opened ?? 0;
    const sameDay = r?.opened_same_day ?? 0;
    const conv = acquired > 0 ? Math.round((sameDay / acquired) * 100) : 0;
    return {
      id: am.id,
      full_name: am.full_name,
      am_code: am.am_code,
      initials: am.initials,
      color: am.color,
      pc_name: pc?.name ?? "",
      filed: !!r,
      acquired, opened, conv,
      submitted_at: r?.submitted_at ?? null,
    };
  });
  const acquisitionState: WindowState = {
    opened_at: findWindow("acquisition", "single")?.opened_at ?? null,
    closed_at: findWindow("acquisition", "single")?.closed_at ?? null,
    filed: (todaysReports ?? []).length,
    total: totalAms,
  };

  // Retention
  const fillerIds = Array.from(new Set((retentionToday ?? []).map((r) => r.filled_by_am_id)));
  const fillerById = new Map<string, { full_name: string; initials: string; color: string }>();
  if (fillerIds.length > 0) {
    const { data: fillers } = await supabase
      .from("account_managers").select("id, full_name, initials, color").in("id", fillerIds);
    for (const f of fillers ?? []) {
      fillerById.set(f.id, { full_name: f.full_name, initials: f.initials, color: f.color });
    }
  }
  function entriesForSlot(slot: "midday" | "eod"): TeamEntry[] {
    const slotRows = (retentionToday ?? []).filter((r) => r.slot === slot);
    const byPc = new Map(slotRows.map((r) => [r.pc_id, r]));
    return (pcs ?? []).map((pc) => {
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
  }
  const middayEntries = entriesForSlot("midday");
  const eodEntries    = entriesForSlot("eod");
  const middayState: WindowState = {
    opened_at: findWindow("retention", "midday")?.opened_at ?? null,
    closed_at: findWindow("retention", "midday")?.closed_at ?? null,
    filed: middayEntries.filter((e) => e.filed).length,
    total: totalPcs,
  };
  const eodState: WindowState = {
    opened_at: findWindow("retention", "eod")?.opened_at ?? null,
    closed_at: findWindow("retention", "eod")?.closed_at ?? null,
    filed: eodEntries.filter((e) => e.filed).length,
    total: totalPcs,
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHead title="Dashboard" sub={`${divisionName} · ${fmtToday()}`} />

      <section className="flex flex-col gap-4">
        <WindowTile
          label="Customer acquisition"
          sublabel="One filing per AM, throughout the day"
          reportType="acquisition"
          slot="single"
          state={acquisitionState}
          downloadHref={null}
        />
        {acquisitionState.opened_at && (
          <AcquisitionLive entries={acquisitionEntries} />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <WindowTile
          label="Retention · 12pm"
          sublabel="Midday snapshot — one per team"
          reportType="retention"
          slot="midday"
          state={middayState}
          downloadHref="/admin/retention/export/midday"
        />
        {middayState.opened_at && (
          <RetentionLive entries={middayEntries} />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <WindowTile
          label="Retention · 5pm"
          sublabel="End of day snapshot — one per team"
          reportType="retention"
          slot="eod"
          state={eodState}
          downloadHref="/admin/retention/export/eod"
        />
        {eodState.opened_at && (
          <RetentionLive entries={eodEntries} />
        )}
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
