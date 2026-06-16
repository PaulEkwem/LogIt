import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportsControls, type Tab, type Range } from "@/components/admin/ReportsControls";
import { BarChart, type BarDatum } from "@/components/admin/BarChart";
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
  // Short DOW for week; day-month for longer ranges
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
function netColor(n: number): string {
  if (n < 0) return "#DC2626";
  if (n < 100) return "var(--color-pending)";
  return "#16A34A";
}

type RouteProps = {
  searchParams: Promise<{ tab?: string; range?: string; from?: string; to?: string }>;
};

export default async function AdminReportsPage({ searchParams }: RouteProps) {
  const params = await searchParams;
  const tab: Tab = params.tab === "retention" ? "retention" : "acquisition";
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

  const { data: pcs } = await supabase
    .from("pcs").select("id").eq("division_id", divisionId).is("archived_at", null);
  const pcIds = (pcs ?? []).map((p) => p.id);
  const totalPcs = pcIds.length;

  const { data: ams } = await supabase
    .from("account_managers").select("id, pc_id").is("archived_at", null).in("pc_id", pcIds.length ? pcIds : ["00000000-0000-0000-0000-000000000000"]);
  const amIds = (ams ?? []).map((a) => a.id);
  const totalAms = amIds.length;

  // Pull only what we need per tab.
  let acquisition: { am_id: string; report_date: string; acquired: number; total_opened: number }[] = [];
  let retention: { pc_id: string; slot: string; report_date: string; retention_naira_m: number }[] = [];
  if (tab === "acquisition" && amIds.length) {
    const { data } = await supabase.from("daily_reports")
      .select("am_id, report_date, acquired, total_opened")
      .gte("report_date", fromDate).lte("report_date", toDate)
      .in("am_id", amIds);
    acquisition = data ?? [];
  } else if (tab === "retention" && pcIds.length) {
    const { data } = await supabase.from("retention_reports")
      .select("pc_id, slot, report_date, retention_naira_m")
      .gte("report_date", fromDate).lte("report_date", toDate)
      .in("pc_id", pcIds);
    retention = data ?? [];
  }

  // Build day list newest first
  const days: string[] = [];
  const start = new Date(fromDate + "T00:00:00");
  const end   = new Date(toDate   + "T00:00:00");
  for (let d = new Date(end); d.getTime() >= start.getTime(); d.setDate(d.getDate() - 1)) {
    days.push(isoDate(d));
  }
  const chartDays = [...days].reverse(); // oldest → newest for the chart left→right

  // ---------- ACQUISITION view ----------
  let chartData: BarDatum[] = [];
  let dayRows: { iso: string; label: string; isToday: boolean; primary: string; secondary: string; downloads: { href: string; label: string }[] }[] = [];

  if (tab === "acquisition") {
    chartData = chartDays.map((iso) => {
      const rows = acquisition.filter((r) => r.report_date === iso);
      const opened = rows.reduce((s, r) => s + r.total_opened, 0);
      return {
        label: fmtShortChartLabel(iso, chartDays.length),
        value: opened,
        color: "var(--color-brand-red)",
      };
    });

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
        secondary: filed > 0
          ? `${acquired} acquired · ${filed}/${totalAms} AMs filed`
          : "No filings",
        downloads: [], // acquisition PDF not built yet
      };
    });
  } else {
    // ---------- RETENTION view ----------
    chartData = chartDays.map((iso) => {
      // Prefer EOD net (later slot) for the day's headline trend; fall back to midday.
      const eodRows    = retention.filter((r) => r.report_date === iso && r.slot === "eod");
      const middayRows = retention.filter((r) => r.report_date === iso && r.slot === "midday");
      const eodNet    = eodRows.reduce((s, r) => s + Number(r.retention_naira_m), 0);
      const middayNet = middayRows.reduce((s, r) => s + Number(r.retention_naira_m), 0);
      const value = eodRows.length > 0 ? eodNet : middayRows.length > 0 ? middayNet : 0;
      return {
        label: fmtShortChartLabel(iso, chartDays.length),
        value,
        color: value < 0 ? "#DC2626" : value < 100 ? "var(--color-pending)" : "#16A34A",
      };
    });

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

      return {
        iso,
        label: fmtFull(iso),
        isToday: iso === today,
        primary: anyFiled
          ? `Net ${headlineNet < 0 ? "−" : "+"}₦${fmtMoney(headlineNet)}M`
          : "No filings",
        secondary: parts.length ? parts.join(" · ") : `0/${totalPcs} teams filed`,
        downloads,
      };
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHead title="Reports" sub="Browse history and download completed reports" />

      <ReportsControls tab={tab} range={range} defaultFrom={fromDate} defaultTo={toDate} />

      <section>
        <SectionTitle>
          {tab === "acquisition" ? "Daily accounts opened" : "Daily net retention"}
        </SectionTitle>
        <BarChart
          data={chartData}
          signed={tab === "retention"}
          formatValue={tab === "retention"
            ? (n) => `${n < 0 ? "−" : "+"}₦${fmtMoney(n)}M`
            : (n) => `${n}`}
          baseColor="var(--color-brand-red)"
          emptyHint={`No ${tab} data between ${fmtFull(fromDate)} and ${fmtFull(toDate)}.`}
        />
      </section>

      <section>
        <SectionTitle>By day · {dayRows.length} {dayRows.length === 1 ? "day" : "days"}</SectionTitle>
        <div className="flex flex-col gap-2">
          {dayRows.map((row) => (
            <DayRow key={row.iso} row={row} tab={tab} />
          ))}
        </div>
        {tab === "acquisition" && (
          <div className="text-center text-[11px] font-bold mt-3" style={{ color: "var(--color-muted)" }}>
            Acquisition PDF export coming soon.
          </div>
        )}
      </section>
    </div>
  );
}

function DayRow({
  row, tab,
}: {
  row: { iso: string; label: string; isToday: boolean; primary: string; secondary: string; downloads: { href: string; label: string }[] };
  tab: Tab;
}) {
  // Tint primary if retention (positive vs negative)
  const sign = tab === "retention" && row.primary.includes("−") ? "neg" : tab === "retention" && row.primary.startsWith("Net") ? "pos" : "neutral";
  const primaryColor = sign === "neg" ? "#DC2626" : sign === "pos" ? "#16A34A" : "var(--color-ink)";

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

      <div className="font-black num text-[16px]" style={{ color: primaryColor, letterSpacing: "-0.02em" }}>
        {row.primary}
      </div>

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
