import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AcquisitionPrintView, type AmRow } from "@/components/AcquisitionPrintView";
import { lagosDate } from "@/lib/time";

export const dynamic = "force-dynamic";

type RouteProps = {
  searchParams: Promise<{ date?: string }>;
};

function isValidDate(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function AcquisitionExportPage({ searchParams }: RouteProps) {
  const { date: dateParam } = await searchParams;
  const reportDate = isValidDate(dateParam) ? dateParam! : lagosDate();

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const meta = user.app_metadata as { role?: string; division_id?: string };
  if (meta.role !== "admin" || !meta.division_id) redirect("/home");

  const { data: division } = await supabase
    .from("divisions").select("name").eq("id", meta.division_id).maybeSingle();
  const divisionName = division?.name ?? "";

  const { data: pcs } = await supabase
    .from("pcs").select("id, name, pc_code").eq("division_id", meta.division_id)
    .is("archived_at", null).order("name");

  const pcIds = (pcs ?? []).map((p) => p.id);
  const pcById = new Map((pcs ?? []).map((p) => [p.id, p]));

  const { data: ams } = await supabase
    .from("account_managers")
    .select("id, full_name, am_code, pc_id")
    .is("archived_at", null)
    .in("pc_id", pcIds.length ? pcIds : ["00000000-0000-0000-0000-000000000000"])
    .order("am_code");

  const { data: reports } = await supabase
    .from("daily_reports")
    .select("am_id, acquired, total_opened, opened_same_day, submitted_at")
    .eq("report_date", reportDate);

  const reportByAm = new Map((reports ?? []).map((r) => [r.am_id, r]));

  const rows: AmRow[] = (ams ?? []).map((am) => {
    const r = reportByAm.get(am.id);
    const pc = pcById.get(am.pc_id);
    const pc_name = pc?.name ?? "—";
    const pc_code = pc?.pc_code ?? "—";
    if (!r) {
      return { am_code: am.am_code, full_name: am.full_name, pc_name, pc_code, filed: false };
    }
    return {
      am_code: am.am_code,
      full_name: am.full_name,
      pc_name, pc_code,
      filed: true,
      acquired: r.acquired,
      opened: r.total_opened,
    };
  });

  const totals = (reports ?? []).reduce(
    (acc, r) => ({ acquired: acc.acquired + r.acquired, opened: acc.opened + r.total_opened }),
    { acquired: 0, opened: 0 },
  );

  const userMeta = user.user_metadata as { first_name?: string; last_name?: string };
  const adminName = [userMeta.first_name, userMeta.last_name].filter(Boolean).join(" ") || "Admin";

  return (
    <AcquisitionPrintView
      divisionName={divisionName}
      reportDate={reportDate}
      rows={rows}
      totals={totals}
      filedCount={(reports ?? []).length}
      adminName={adminName}
    />
  );
}
