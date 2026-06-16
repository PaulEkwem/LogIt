import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportsHistory, type DayRow } from "@/components/admin/ReportsHistory";

export const dynamic = "force-dynamic";

type RouteProps = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function AdminReportsPage({ searchParams }: RouteProps) {
  const { from: fromParam, to: toParam } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const meta = user!.app_metadata as { pc_id?: string; division_id?: string };

  let divisionId = meta.division_id ?? "";
  if (!divisionId && meta.pc_id) {
    const { data } = await supabase.from("pcs").select("division_id").eq("id", meta.pc_id).maybeSingle();
    divisionId = (data as { division_id?: string } | null)?.division_id ?? "";
  }

  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.now() - 13 * 86_400_000).toISOString().slice(0, 10); // last 14 days
  const fromDate = isValidDate(fromParam) ? fromParam! : defaultFrom;
  const toDate   = isValidDate(toParam)   ? toParam!   : today;

  // Active PCs in this division — used for totals
  const { data: pcs } = await supabase
    .from("pcs").select("id").eq("division_id", divisionId).is("archived_at", null);
  const pcIds = (pcs ?? []).map((p) => p.id);
  const totalPcs = pcIds.length;

  // Active AMs in this division — used for acquisition totals
  const { data: ams } = await supabase
    .from("account_managers").select("id, pc_id").is("archived_at", null).in("pc_id", pcIds.length ? pcIds : ["00000000-0000-0000-0000-000000000000"]);
  const amIds = (ams ?? []).map((a) => a.id);
  const totalAms = amIds.length;

  // Pull all daily_reports + retention_reports in the range
  const [{ data: dailyReports }, { data: retentionReports }] = await Promise.all([
    amIds.length
      ? supabase.from("daily_reports")
          .select("am_id, report_date, acquired, total_opened")
          .gte("report_date", fromDate).lte("report_date", toDate)
          .in("am_id", amIds)
      : Promise.resolve({ data: [] as { am_id: string; report_date: string; acquired: number; total_opened: number }[] }),
    pcIds.length
      ? supabase.from("retention_reports")
          .select("pc_id, slot, report_date, pledges_naira_m, inflow_naira_m, outflow_naira_m, retention_naira_m")
          .gte("report_date", fromDate).lte("report_date", toDate)
          .in("pc_id", pcIds)
      : Promise.resolve({ data: [] as { pc_id: string; slot: string; report_date: string; pledges_naira_m: number; inflow_naira_m: number; outflow_naira_m: number; retention_naira_m: number }[] }),
  ]);

  // Build day-by-day rows, newest first
  const days: DayRow[] = [];
  const start = new Date(fromDate + "T00:00:00");
  const end   = new Date(toDate   + "T00:00:00");
  for (let d = new Date(end); d.getTime() >= start.getTime(); d.setDate(d.getDate() - 1)) {
    const iso = d.toISOString().slice(0, 10);
    const dayReports = (dailyReports ?? []).filter((r) => r.report_date === iso);
    const midday = (retentionReports ?? []).filter((r) => r.report_date === iso && r.slot === "midday");
    const eod    = (retentionReports ?? []).filter((r) => r.report_date === iso && r.slot === "eod");
    days.push({
      date: iso,
      label: fmtFull(d),
      isToday: iso === today,
      acquisition: {
        filed: dayReports.length,
        total: totalAms,
        acquired: dayReports.reduce((s, r) => s + r.acquired, 0),
        opened: dayReports.reduce((s, r) => s + r.total_opened, 0),
      },
      midday: {
        filed: midday.length,
        total: totalPcs,
        net: midday.reduce((s, r) => s + Number(r.retention_naira_m), 0),
        download_href: `/admin/retention/export/midday?date=${iso}`,
      },
      eod: {
        filed: eod.length,
        total: totalPcs,
        net: eod.reduce((s, r) => s + Number(r.retention_naira_m), 0),
        download_href: `/admin/retention/export/eod?date=${iso}`,
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Reports history" sub={`${days.length} day${days.length === 1 ? "" : "s"} · re-download any PDF`} />
      <ReportsHistory defaultFrom={fromDate} defaultTo={toDate} days={days} />
    </div>
  );
}

function isValidDate(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function fmtFull(d: Date): string {
  const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return `${DOW[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
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
