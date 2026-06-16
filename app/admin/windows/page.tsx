import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WindowTile, type WindowState } from "@/components/admin/WindowTile";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtToday() {
  const d = new Date();
  return `${d.toLocaleDateString(undefined, { weekday: "long" })}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default async function AdminWindowsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const meta = user!.app_metadata as { pc_id?: string; division_id?: string };

  let divisionId = meta.division_id ?? "";
  if (!divisionId && meta.pc_id) {
    const { data } = await supabase.from("pcs").select("division_id").eq("id", meta.pc_id).maybeSingle();
    divisionId = (data as { division_id?: string } | null)?.division_id ?? "";
  }

  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: pcs },
    { data: ams },
    { data: todaysReports },
    { data: retentionToday },
    { data: windows },
  ] = await Promise.all([
    supabase.from("pcs").select("id").eq("division_id", divisionId).is("archived_at", null),
    supabase.from("account_managers").select("id").is("archived_at", null),
    supabase.from("daily_reports").select("id, am_id").eq("report_date", today),
    supabase.from("retention_reports").select("pc_id, slot").eq("report_date", today),
    supabase.from("report_windows")
      .select("report_type, slot, opened_at, closed_at, closed_reason")
      .eq("division_id", divisionId).eq("report_date", today),
  ]);

  const totalAms = (ams ?? []).length;
  const totalPcs = (pcs ?? []).length;
  const acquisitionFiled = (todaysReports ?? []).length;
  const middayFiled = (retentionToday ?? []).filter((r) => r.slot === "midday").length;
  const eodFiled    = (retentionToday ?? []).filter((r) => r.slot === "eod").length;

  const findWindow = (type: "acquisition" | "retention", slot: string) =>
    (windows ?? []).find((w) => w.report_type === type && w.slot === slot);

  const acq: WindowState = {
    opened_at: findWindow("acquisition", "single")?.opened_at ?? null,
    closed_at: findWindow("acquisition", "single")?.closed_at ?? null,
    filed: acquisitionFiled,
    total: totalAms,
  };
  const mid: WindowState = {
    opened_at: findWindow("retention", "midday")?.opened_at ?? null,
    closed_at: findWindow("retention", "midday")?.closed_at ?? null,
    filed: middayFiled,
    total: totalPcs,
  };
  const eod: WindowState = {
    opened_at: findWindow("retention", "eod")?.opened_at ?? null,
    closed_at: findWindow("retention", "eod")?.closed_at ?? null,
    filed: eodFiled,
    total: totalPcs,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Open a report" sub={fmtToday()} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <WindowTile
          label="Customer acquisition"
          sublabel="One filing per AM, throughout the day"
          reportType="acquisition"
          slot="single"
          state={acq}
          downloadHref={null}
        />
        <WindowTile
          label="Retention · 12pm"
          sublabel="Midday snapshot — one per team"
          reportType="retention"
          slot="midday"
          state={mid}
          downloadHref="/admin/retention/export/midday"
        />
        <WindowTile
          label="Retention · 5pm"
          sublabel="End of day snapshot — one per team"
          reportType="retention"
          slot="eod"
          state={eod}
          downloadHref="/admin/retention/export/eod"
        />
      </div>

      <div className="rounded-2xl p-4" style={{ background: "white", border: "1.5px dashed var(--color-line)" }}>
        <div className="font-extrabold text-[11px] uppercase mb-1" style={{ color: "var(--color-muted)", letterSpacing: "0.14em" }}>
          Tip
        </div>
        <div className="font-bold text-[13px]" style={{ color: "var(--color-body)", lineHeight: 1.55 }}>
          Each window auto-closes the moment everyone&apos;s filed. Use <b>Close early</b> if you&apos;re waiting on
          someone who&apos;s on leave. Re-opening on the same day picks the window back up without losing
          anyone&apos;s submission.
        </div>
      </div>
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
