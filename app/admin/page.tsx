import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WindowTile, type WindowState } from "@/components/admin/WindowTile";
import { AcquisitionLive, type AmEntry } from "@/components/admin/AcquisitionLive";
import { RetentionLive, type TeamEntry } from "@/components/admin/RetentionLive";
import { HeadlineKpis } from "@/components/admin/HeadlineKpis";
import { QuickActions } from "@/components/admin/QuickActions";
import { YesterdayRecap, type YesterdayData } from "@/components/admin/YesterdayRecap";
import { WatchList, type WatchItem } from "@/components/admin/WatchList";
import { WindowSummaryRow } from "@/components/admin/WindowSummaryRow";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtToday() {
  const d = new Date();
  return `${d.toLocaleDateString(undefined, { weekday: "long" })}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtShort(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return `${DOW[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
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
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  const [
    { data: pcs },
    { data: ams },
    { data: todaysReports },
    { data: retentionToday },
    { data: windows },
    { data: yesterdayReports },
    { data: retentionYesterday },
    { data: lastFiledRows },
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
    supabase.from("daily_reports").select("am_id, acquired, total_opened").eq("report_date", yesterday),
    supabase.from("retention_reports").select("pc_id, slot, retention_naira_m").eq("report_date", yesterday),
    // For the watch list: when did each AM last file?
    supabase.from("daily_reports").select("am_id, report_date").gte("report_date", new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10)),
  ]);

  const pcById = new Map((pcs ?? []).map((p) => [p.id, p]));
  const totalPcs = (pcs ?? []).length;
  const totalAms = (ams ?? []).length;

  const findWindow = (type: "acquisition" | "retention", slot: string) =>
    (windows ?? []).find((w) => w.report_type === type && w.slot === slot);

  // ============================================================================
  // Acquisition data
  // ============================================================================
  const reportByAm = new Map((todaysReports ?? []).map((r) => [r.am_id, r]));
  const acquisitionEntries: AmEntry[] = (ams ?? []).map((am) => {
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
  const acquisitionState: WindowState = {
    opened_at: findWindow("acquisition", "single")?.opened_at ?? null,
    closed_at: findWindow("acquisition", "single")?.closed_at ?? null,
    filed: (todaysReports ?? []).length,
    total: totalAms,
  };
  const acquisitionLive = !!acquisitionState.opened_at && !acquisitionState.closed_at;
  const acquisitionClosed = !!acquisitionState.opened_at && !!acquisitionState.closed_at;
  const totalOpenedToday = (todaysReports ?? []).reduce((s, r) => s + r.total_opened, 0);
  const totalAcquiredToday = (todaysReports ?? []).reduce((s, r) => s + r.acquired, 0);

  // ============================================================================
  // Retention data
  // ============================================================================
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
  const middayLive = !!middayState.opened_at && !middayState.closed_at;
  const middayClosed = !!middayState.opened_at && !!middayState.closed_at;
  const eodLive = !!eodState.opened_at && !eodState.closed_at;
  const eodClosed = !!eodState.opened_at && !!eodState.closed_at;

  const middayNetTotal = middayEntries.filter((e) => e.filed).reduce((s, e) => s + e.net, 0);
  const eodNetTotal    = eodEntries.filter((e) => e.filed).reduce((s, e) => s + e.net, 0);

  // Headline retention net: prefer EOD (later slot) if any filed; else midday.
  let headlineNet: number | null = null;
  let headlineSlot: string | null = null;
  if (eodEntries.some((e) => e.filed)) {
    headlineNet = eodNetTotal;
    headlineSlot = "5pm";
  } else if (middayEntries.some((e) => e.filed)) {
    headlineNet = middayNetTotal;
    headlineSlot = "12pm";
  }

  // Today's PDF link — pick the latest slot with any data, or fall back to midday by default.
  const pdfHref = eodEntries.some((e) => e.filed)
    ? "/admin/retention/export/eod"
    : middayEntries.some((e) => e.filed)
      ? "/admin/retention/export/midday"
      : null;

  // ============================================================================
  // Yesterday recap
  // ============================================================================
  const ydEodNet    = (retentionYesterday ?? []).filter((r) => r.slot === "eod")
    .reduce((s, r) => s + Number(r.retention_naira_m), 0);
  const ydEodCount  = (retentionYesterday ?? []).filter((r) => r.slot === "eod").length;
  const ydMidNet    = (retentionYesterday ?? []).filter((r) => r.slot === "midday")
    .reduce((s, r) => s + Number(r.retention_naira_m), 0);
  const ydMidCount  = (retentionYesterday ?? []).filter((r) => r.slot === "midday").length;

  const ydData: YesterdayData = {
    hadAnyData: (yesterdayReports ?? []).length > 0 || (retentionYesterday ?? []).length > 0,
    amsFiled: (yesterdayReports ?? []).length,
    amsTotal: totalAms,
    opened: (yesterdayReports ?? []).reduce((s, r) => s + r.total_opened, 0),
    acquired: (yesterdayReports ?? []).reduce((s, r) => s + r.acquired, 0),
    retentionTeamsFiled: Math.max(ydEodCount, ydMidCount),
    retentionTeamsTotal: totalPcs,
    retentionNet: ydEodCount > 0 ? ydEodNet : ydMidCount > 0 ? ydMidNet : null,
    retentionSlotLabel: ydEodCount > 0 ? "5pm" : ydMidCount > 0 ? "12pm" : null,
    dateLabel: fmtShort(yesterday),
  };

  // ============================================================================
  // Watch list — AMs who haven't filed in 2+ days while acquisition is/was open today
  // ============================================================================
  const lastFiledByAm = new Map<string, string>();
  for (const r of lastFiledRows ?? []) {
    const existing = lastFiledByAm.get(r.am_id);
    if (!existing || r.report_date > existing) lastFiledByAm.set(r.am_id, r.report_date);
  }
  const twoDaysAgoIso = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
  const overdueAms = (ams ?? []).filter((am) => {
    const last = lastFiledByAm.get(am.id);
    return !last || last < twoDaysAgoIso;
  });
  const watchItems: WatchItem[] = [];
  if (acquisitionLive && overdueAms.length > 0) {
    watchItems.push({
      kind: "am-overdue",
      label: `${overdueAms.length} AM${overdueAms.length === 1 ? "" : "s"} overdue`,
      detail: overdueAms.length <= 4
        ? overdueAms.map((a) => a.full_name.split(" ")[0]).join(", ")
        : `${overdueAms.slice(0, 3).map((a) => a.full_name.split(" ")[0]).join(", ")} + ${overdueAms.length - 3} more`,
    });
  }
  // Missed yesterday's retention 5pm (any team that didn't file)
  if (ydEodCount > 0 && ydEodCount < totalPcs) {
    const missed = totalPcs - ydEodCount;
    watchItems.push({
      kind: "team-missed",
      label: `${missed} team${missed === 1 ? "" : "s"} missed yesterday's 5pm retention`,
      detail: "Worth a chase before today's window opens",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Dashboard" sub={`${divisionName} · ${fmtToday()}`} />

      {/* Headline KPIs */}
      <HeadlineKpis
        openedToday={totalOpenedToday}
        netRetentionToday={headlineNet}
        retentionSlotLabel={headlineSlot}
        amsFiled={acquisitionState.filed}
        amsTotal={totalAms}
      />

      {/* Watch list (only if anything's worth surfacing) */}
      <WatchList items={watchItems} />

      {/* Quick actions */}
      <QuickActions pdfHref={pdfHref} />

      {/* Live windows */}
      <section id="windows" className="flex flex-col gap-4">
        <SectionTitle>Today&apos;s reports</SectionTitle>

        <div className="flex flex-col gap-3">
          <WindowTile
            label="Customer acquisition"
            sublabel="One filing per AM, throughout the day"
            reportType="acquisition"
            slot="single"
            state={acquisitionState}
            downloadHref={null}
          />
          {acquisitionLive && <AcquisitionLive entries={acquisitionEntries} />}
          {acquisitionClosed && (
            <WindowSummaryRow
              kind="acquisition"
              opened={totalOpenedToday}
              acquired={totalAcquiredToday}
              filed={acquisitionState.filed}
              total={acquisitionState.total}
            />
          )}
        </div>

        <div className="flex flex-col gap-3">
          <WindowTile
            label="Retention · 12pm"
            sublabel="Midday snapshot — one per team"
            reportType="retention"
            slot="midday"
            state={middayState}
            downloadHref="/admin/retention/export/midday"
          />
          {middayLive && <RetentionLive entries={middayEntries} />}
          {middayClosed && (
            <WindowSummaryRow
              kind="retention"
              net={middayNetTotal}
              filed={middayState.filed}
              total={middayState.total}
            />
          )}
        </div>

        <div className="flex flex-col gap-3">
          <WindowTile
            label="Retention · 5pm"
            sublabel="End of day snapshot — one per team"
            reportType="retention"
            slot="eod"
            state={eodState}
            downloadHref="/admin/retention/export/eod"
          />
          {eodLive && <RetentionLive entries={eodEntries} />}
          {eodClosed && (
            <WindowSummaryRow
              kind="retention"
              net={eodNetTotal}
              filed={eodState.filed}
              total={eodState.total}
            />
          )}
        </div>
      </section>

      {/* Yesterday recap at the bottom for morning context */}
      <YesterdayRecap data={ydData} />
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
    <div className="font-extrabold text-[11px] uppercase" style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}>
      {children}
    </div>
  );
}
