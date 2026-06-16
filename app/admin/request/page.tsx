import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportsControls, type Tab, type Range } from "@/components/admin/ReportsControls";
import { BarChart, type BarDatum } from "@/components/admin/BarChart";
import { WindowTile, type WindowState } from "@/components/admin/WindowTile";
import { AcquisitionLive, type AmEntry } from "@/components/admin/AcquisitionLive";
import { RetentionLive, type TeamEntry } from "@/components/admin/RetentionLive";
import { type Slot } from "@/components/admin/DashboardTabs";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }
function isValidDate(s: string | undefined): s is string { return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s); }
function fmtFull(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${DOW[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtShortChartLabel(iso: string, rangeLen: number): string {
  const d = new Date(iso + "T00:00:00");
  if (rangeLen <= 7) return DOW_SHORT[d.getDay()];
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs < 1) return abs.toFixed(2);
  if (abs < 10) return abs.toFixed(1);
  return abs.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

type RouteProps = {
  searchParams: Promise<{ tab?: string; slot?: string; range?: string; from?: string; to?: string }>;
};

export default async function AdminRequestPage({ searchParams }: RouteProps) {
  const params = await searchParams;
  const tab: Tab = params.tab === "retention" ? "retention" : "acquisition";
  const slot: Slot = params.slot === "eod" ? "eod" : "midday";
  const range: Range = params.range === "today" ? "today"
    : params.range === "month" ? "month"
    : params.range === "custom" ? "custom"
    : "week";

  const today = isoDate(new Date());
  let fromDate: string;
  let toDate: string;
  if (range === "today") {
    fromDate = today; toDate = today;
  } else if (range === "week") {
    fromDate = isoDate(new Date(Date.now() - 6 * 86_400_000));
    toDate = today;
  } else if (range === "month") {
    fromDate = isoDate(new Date(Date.now() - 29 * 86_400_000));
    toDate = today;
  } else {
    fromDate = isValidDate(params.from) ? params.from! : isoDate(new Date(Date.now() - 6 * 86_400_000));
    toDate   = isValidDate(params.to)   ? params.to!   : today;
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const meta = user!.app_metadata as { pc_id?: string; division_id?: string };

  let divisionId = meta.division_id ?? "";
  if (!divisionId && meta.pc_id) {
    const { data } = await supabase.from("pcs").select("division_id").eq("id", meta.pc_id).maybeSingle();
    divisionId = (data as { division_id?: string } | null)?.division_id ?? "";
  }

  // Parallel-fetch everything that depends only on divisionId.
  const [
    { data: division },
    { data: pcs },
    { data: todaysWindows },
  ] = await Promise.all([
    supabase.from("divisions").select("name").eq("id", divisionId).maybeSingle(),
    supabase.from("pcs").select("id, name, pc_code").eq("division_id", divisionId).is("archived_at", null).order("name"),
    supabase.from("report_windows")
      .select("report_type, slot, opened_at, closed_at, closed_reason")
      .eq("division_id", divisionId).eq("report_date", today),
  ]);
  const divisionName = division?.name ?? "";
  const pcIds = (pcs ?? []).map((p) => p.id);
  const totalPcs = pcIds.length;
  const PLACEHOLDER_UUID = "00000000-0000-0000-0000-000000000000";

  const { data: ams } = await supabase
    .from("account_managers")
    .select("id, full_name, am_code, initials, color, pc_id")
    .is("archived_at", null)
    .in("pc_id", pcIds.length ? pcIds : [PLACEHOLDER_UUID]);
  const amIds = (ams ?? []).map((a) => a.id);
  const totalAms = amIds.length;

  const findWindow = (type: "acquisition" | "retention", s: string) =>
    (todaysWindows ?? []).find((w) => w.report_type === type && w.slot === s);

  // Now the range data (depends on amIds for acquisition, pcIds for retention).
  let acquisition: { am_id: string; report_date: string; acquired: number; total_opened: number; opened_same_day?: number; submitted_at?: string }[] = [];
  let retention: { pc_id: string; slot: string; report_date: string; retention_naira_m: number; pledges_naira_m?: number; inflow_naira_m?: number; outflow_naira_m?: number; filled_by_am_id?: string; submitted_at?: string }[] = [];

  if (tab === "acquisition" && amIds.length) {
    const { data } = await supabase.from("daily_reports")
      .select("am_id, report_date, acquired, total_opened, opened_same_day, submitted_at")
      .gte("report_date", fromDate).lte("report_date", toDate)
      .in("am_id", amIds);
    acquisition = data ?? [];
  } else if (tab === "retention" && pcIds.length) {
    const { data } = await supabase.from("retention_reports")
      .select("pc_id, slot, report_date, pledges_naira_m, inflow_naira_m, outflow_naira_m, retention_naira_m, filled_by_am_id, submitted_at")
      .gte("report_date", fromDate).lte("report_date", toDate)
      .in("pc_id", pcIds);
    retention = data ?? [];
  }

  // Build day list newest-first and chart days oldest-first
  const days: string[] = [];
  const start = new Date(fromDate + "T00:00:00");
  const end   = new Date(toDate   + "T00:00:00");
  for (let d = new Date(end); d.getTime() >= start.getTime(); d.setDate(d.getDate() - 1)) {
    days.push(isoDate(d));
  }
  const chartDays = [...days].reverse();

  // ============================================================================
  // Chart cells — replace today's bar with "+ Request" CTA if not requested
  // ============================================================================

  // Resolve which window we're looking at for the CTA decision
  const isTodayInRange = chartDays.includes(today);
  const ctaReportType: "acquisition" | "retention" = tab;
  const ctaSlot: "single" | "midday" | "eod" = tab === "acquisition" ? "single" : slot;
  const todayWindow = findWindow(ctaReportType, ctaSlot);
  const todayNotRequested = !todayWindow?.opened_at;

  let chartCells: BarDatum[] = [];

  if (tab === "acquisition") {
    chartCells = chartDays.map((iso) => {
      const rows = acquisition.filter((r) => r.report_date === iso);
      const opened = rows.reduce((s, r) => s + r.total_opened, 0);
      const isToday = iso === today;
      if (isToday && todayNotRequested) {
        return {
          label: fmtShortChartLabel(iso, chartDays.length),
          value: 0,
          cta: { reportType: "acquisition", slot: "single", label: "Request acquisition" },
        };
      }
      return {
        label: fmtShortChartLabel(iso, chartDays.length),
        value: opened,
        color: "var(--color-brand-red)",
      };
    });
  } else {
    chartCells = chartDays.map((iso) => {
      const eodRows    = retention.filter((r) => r.report_date === iso && r.slot === "eod");
      const middayRows = retention.filter((r) => r.report_date === iso && r.slot === "midday");
      const eodNet    = eodRows.reduce((s, r) => s + Number(r.retention_naira_m), 0);
      const middayNet = middayRows.reduce((s, r) => s + Number(r.retention_naira_m), 0);
      // For retention chart bar: show net for the currently selected slot
      const slotRows = slot === "eod" ? eodRows : middayRows;
      const slotNet  = slot === "eod" ? eodNet  : middayNet;
      const isToday = iso === today;
      if (isToday && todayNotRequested) {
        return {
          label: fmtShortChartLabel(iso, chartDays.length),
          value: 0,
          cta: {
            reportType: "retention",
            slot,
            label: `Request ${slot === "eod" ? "5pm" : "12pm"}`,
          },
        };
      }
      const value = slotRows.length > 0 ? slotNet : 0;
      return {
        label: fmtShortChartLabel(iso, chartDays.length),
        value,
        color: value < 0 ? "#DC2626" : value < 100 ? "var(--color-pending)" : "#16A34A",
      };
    });
  }

  // ============================================================================
  // Below the chart: live monitoring (when range=today) OR day list (otherwise)
  // ============================================================================

  // Build live data for today's selected window
  let liveSection: React.ReactNode = null;

  if (range === "today") {
    if (tab === "acquisition") {
      const pcById = new Map((pcs ?? []).map((p) => [p.id, p]));
      const reportByAm = new Map((acquisition ?? []).filter((r) => r.report_date === today).map((r) => [r.am_id, r]));
      const entries: AmEntry[] = (ams ?? []).map((am) => {
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
        opened_at: todayWindow?.opened_at ?? null,
        closed_at: todayWindow?.closed_at ?? null,
        filed: entries.filter((e) => e.filed).length,
        total: totalAms,
      };
      const live = !!state.opened_at && !state.closed_at;
      liveSection = (
        <section className="flex flex-col gap-4">
          <SectionTitle>Live for today</SectionTitle>
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
    } else {
      // Retention
      const slotRows = retention.filter((r) => r.report_date === today && r.slot === slot);
      const fillerIds = Array.from(new Set(slotRows.map((r) => r.filled_by_am_id!).filter(Boolean)));
      const fillerById = new Map<string, { full_name: string; initials: string; color: string }>();
      if (fillerIds.length > 0) {
        const { data: fillers } = await supabase
          .from("account_managers").select("id, full_name, initials, color").in("id", fillerIds);
        for (const f of fillers ?? []) {
          fillerById.set(f.id, { full_name: f.full_name, initials: f.initials, color: f.color });
        }
      }
      const byPc = new Map(slotRows.map((r) => [r.pc_id, r]));
      const entries: TeamEntry[] = (pcs ?? []).map((pc) => {
        const r = byPc.get(pc.id);
        if (!r) {
          return {
            pc_id: pc.id, pc_name: pc.name, pc_code: pc.pc_code, filed: false,
            pledges: 0, inflow: 0, outflow: 0, net: 0,
            filled_by_name: null, filled_by_initials: null, filled_by_color: null,
            submitted_at: null,
          };
        }
        const f = r.filled_by_am_id ? fillerById.get(r.filled_by_am_id) : undefined;
        return {
          pc_id: pc.id, pc_name: pc.name, pc_code: pc.pc_code, filed: true,
          pledges: Number(r.pledges_naira_m ?? 0),
          inflow:  Number(r.inflow_naira_m  ?? 0),
          outflow: Number(r.outflow_naira_m ?? 0),
          net:     Number(r.retention_naira_m),
          filled_by_name:     f?.full_name ?? null,
          filled_by_initials: f?.initials ?? null,
          filled_by_color:    f?.color ?? null,
          submitted_at: r.submitted_at ?? null,
        };
      });
      const state: WindowState = {
        opened_at: todayWindow?.opened_at ?? null,
        closed_at: todayWindow?.closed_at ?? null,
        filed: entries.filter((e) => e.filed).length,
        total: totalPcs,
      };
      const live = !!state.opened_at && !state.closed_at;
      const slotLabel = slot === "eod" ? "5pm" : "12pm";
      liveSection = (
        <section className="flex flex-col gap-4">
          <SectionTitle>Live for today</SectionTitle>
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
  }

  // Day list (for non-Today ranges)
  type DayRow = { iso: string; label: string; isToday: boolean; primary: string; primaryColor: string; secondary: string; downloads: { href: string; label: string }[] };
  let dayRows: DayRow[] = [];
  if (range !== "today") {
    if (tab === "acquisition") {
      dayRows = days.map((iso) => {
        const rows = acquisition.filter((r) => r.report_date === iso);
        const opened = rows.reduce((s, r) => s + r.total_opened, 0);
        const acquired = rows.reduce((s, r) => s + r.acquired, 0);
        const filed = rows.length;
        return {
          iso,
          label: fmtFull(iso),
          isToday: iso === today,
          primary: `${opened} opened`,
          primaryColor: "var(--color-ink)",
          secondary: filed > 0 ? `${acquired} acquired · ${filed}/${totalAms} AMs filed` : "No filings",
          downloads: [],
        };
      });
    } else {
      dayRows = days.map((iso) => {
        const middayRows = retention.filter((r) => r.report_date === iso && r.slot === "midday");
        const eodRows    = retention.filter((r) => r.report_date === iso && r.slot === "eod");
        const middayNet = middayRows.reduce((s, r) => s + Number(r.retention_naira_m), 0);
        const eodNet    = eodRows.reduce((s, r) => s + Number(r.retention_naira_m), 0);
        const middayCount = middayRows.length;
        const eodCount    = eodRows.length;
        const anyFiled = middayCount > 0 || eodCount > 0;
        const parts: string[] = [];
        if (middayCount > 0) parts.push(`12pm net ${middayNet < 0 ? "−" : "+"}₦${fmtMoney(middayNet)}M (${middayCount}/${totalPcs})`);
        if (eodCount > 0)    parts.push(`5pm net ${eodNet < 0 ? "−" : "+"}₦${fmtMoney(eodNet)}M (${eodCount}/${totalPcs})`);
        const downloads: { href: string; label: string }[] = [];
        if (middayCount > 0) downloads.push({ href: `/admin/retention/export/midday?date=${iso}`, label: "12pm" });
        if (eodCount > 0)    downloads.push({ href: `/admin/retention/export/eod?date=${iso}`,    label: "5pm" });
        const headlineNet = eodCount > 0 ? eodNet : middayCount > 0 ? middayNet : 0;
        const primaryColor = anyFiled
          ? (headlineNet < 0 ? "#DC2626" : headlineNet < 100 ? "var(--color-pending)" : "#16A34A")
          : "var(--color-ink)";
        return {
          iso,
          label: fmtFull(iso),
          isToday: iso === today,
          primary: anyFiled ? `Net ${headlineNet < 0 ? "−" : "+"}₦${fmtMoney(headlineNet)}M` : "No filings",
          primaryColor,
          secondary: parts.length ? parts.join(" · ") : `0/${totalPcs} teams filed`,
          downloads,
        };
      });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHead title="Request a report" sub={`${divisionName} · monitor, request, download`} />

      <ReportsControls tab={tab} range={range} defaultFrom={fromDate} defaultTo={toDate} />

      {/* Slot sub-toggle for retention */}
      {tab === "retention" && (
        <DashboardTabsSubToggle slot={slot} tab={tab} range={range} from={fromDate} to={toDate} />
      )}

      <section>
        <SectionTitle>
          {tab === "acquisition" ? "Daily accounts opened" : `Daily net retention · ${slot === "eod" ? "5pm" : "12pm"}`}
        </SectionTitle>
        <BarChart
          data={chartCells}
          height={range === "today" ? 160 : 200}
          signed={tab === "retention"}
          formatValue={tab === "retention"
            ? (n) => `${n < 0 ? "−" : "+"}₦${fmtMoney(n)}M`
            : (n) => `${n}`}
          baseColor="var(--color-brand-red)"
          emptyHint="No data in this range yet."
        />
      </section>

      {/* Below the chart: live monitoring (Today) or day list (Week/Month/Custom) */}
      {range === "today" ? (
        liveSection
      ) : (
        <section>
          <SectionTitle>By day · {dayRows.length} {dayRows.length === 1 ? "day" : "days"}</SectionTitle>
          <div className="flex flex-col gap-2">
            {dayRows.map((row) => (
              <DayRowEl key={row.iso} row={row} />
            ))}
          </div>
          {tab === "acquisition" && (
            <div className="text-center text-[11px] font-bold mt-3" style={{ color: "var(--color-muted)" }}>
              Acquisition PDF export coming soon.
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// Sub-component: retention slot toggle that preserves range/from/to in the URL
function DashboardTabsSubToggle({
  slot, tab, range, from, to,
}: {
  slot: Slot;
  tab: Tab;
  range: Range;
  from: string;
  to: string;
}) {
  void tab;
  function buildHref(nextSlot: Slot) {
    const p = new URLSearchParams();
    p.set("tab", "retention");
    p.set("slot", nextSlot);
    p.set("range", range);
    if (range === "custom") { p.set("from", from); p.set("to", to); }
    return `/admin/request?${p.toString()}`;
  }
  return (
    <div className="grid grid-cols-2 rounded-xl p-1 max-w-[260px]" style={{ background: "var(--color-bg)", border: "1.5px solid var(--color-line)" }}>
      <SlotTab href={buildHref("midday")} label="12pm" active={slot === "midday"} />
      <SlotTab href={buildHref("eod")}    label="5pm"  active={slot === "eod"} />
    </div>
  );
}

function SlotTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a
      href={href}
      className="text-center py-1.5 rounded-lg font-extrabold text-[12px] transition-colors"
      style={{
        background: active ? "var(--color-ink)" : "transparent",
        color: active ? "white" : "var(--color-body)",
        letterSpacing: "-0.005em",
      }}
    >
      {label}
    </a>
  );
}

function DayRowEl({
  row,
}: {
  row: { iso: string; label: string; isToday: boolean; primary: string; primaryColor: string; secondary: string; downloads: { href: string; label: string }[] };
}) {
  return (
    <div className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap" style={{ background: "white", border: row.isToday ? "1.5px solid var(--color-brand-red)" : "1.5px solid var(--color-line)" }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="font-black text-[14px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>{row.label}</div>
          {row.isToday && (
            <span className="font-black text-[9px] rounded-md px-1.5 py-0.5 text-white" style={{ background: "var(--color-brand-red)", letterSpacing: "0.08em" }}>TODAY</span>
          )}
        </div>
        <div className="font-bold text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>{row.secondary}</div>
      </div>
      <div className="font-black num text-[16px]" style={{ color: row.primaryColor, letterSpacing: "-0.02em" }}>{row.primary}</div>
      {row.downloads.length > 0 && (
        <div className="flex gap-1.5">
          {row.downloads.map((d) => (
            <a
              key={d.href}
              href={d.href}
              target="_blank"
              rel="noopener"
              className="rounded-lg px-2.5 py-1.5 font-extrabold text-[11px] inline-flex items-center gap-1.5 text-white"
              style={{ background: "var(--color-ink)" }}
            >
              <Download className="w-3 h-3" /> {d.label}
            </a>
          ))}
        </div>
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-extrabold text-[11px] uppercase mb-2" style={{ color: "var(--color-muted)", letterSpacing: "0.16em" }}>
      {children}
    </div>
  );
}
