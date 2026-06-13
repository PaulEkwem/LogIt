import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RetentionPrintView } from "@/components/RetentionPrintView";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ slot: string }>;
};

export default async function RetentionExportPage({ params }: RouteProps) {
  const { slot: slotParam } = await params;
  const slot = slotParam === "eod" ? "eod" : "midday";

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const meta = user.app_metadata as { role?: string; division_id?: string };
  if (meta.role !== "admin" || !meta.division_id) redirect("/home");

  const today = new Date().toISOString().slice(0, 10);

  const { data: division } = await supabase
    .from("divisions").select("name").eq("id", meta.division_id).maybeSingle();
  const divisionName = division?.name ?? "";

  const { data: pcs } = await supabase
    .from("pcs").select("id, name, pc_code").eq("division_id", meta.division_id).order("name");

  const { data: rows } = await supabase
    .from("retention_reports")
    .select("pc_id, pledges_naira_m, inflow_naira_m, outflow_naira_m, retention_naira_m, filled_by_am_id, submitted_at")
    .eq("report_date", today).eq("slot", slot);

  const fillerIds = Array.from(new Set((rows ?? []).map((r) => r.filled_by_am_id)));
  const fillerById = new Map<string, string>();
  if (fillerIds.length) {
    const { data: fillers } = await supabase
      .from("account_managers").select("id, full_name").in("id", fillerIds);
    for (const f of fillers ?? []) fillerById.set(f.id, f.full_name);
  }

  const rowByPc = new Map((rows ?? []).map((r) => [r.pc_id, r]));

  const tableRows = (pcs ?? []).map((pc) => {
    const r = rowByPc.get(pc.id);
    if (!r) return { pc_name: pc.name, pc_code: pc.pc_code, filed: false as const };
    return {
      pc_name: pc.name,
      pc_code: pc.pc_code,
      filed: true as const,
      pledges: Number(r.pledges_naira_m),
      inflow: Number(r.inflow_naira_m),
      outflow: Number(r.outflow_naira_m),
      net: Number(r.retention_naira_m),
      filled_by: fillerById.get(r.filled_by_am_id) ?? "—",
      time: new Date(r.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  });

  const totals = tableRows.reduce(
    (acc, r) => r.filed
      ? { pledges: acc.pledges + r.pledges, inflow: acc.inflow + r.inflow, outflow: acc.outflow + r.outflow, net: acc.net + r.net }
      : acc,
    { pledges: 0, inflow: 0, outflow: 0, net: 0 },
  );

  const userMeta = user.user_metadata as { first_name?: string; last_name?: string };
  const adminName = [userMeta.first_name, userMeta.last_name].filter(Boolean).join(" ") || "Admin";
  const filedCount = tableRows.filter((r) => r.filed).length;

  return (
    <RetentionPrintView
      slot={slot}
      divisionName={divisionName}
      reportDate={today}
      rows={tableRows}
      totals={totals}
      filedCount={filedCount}
      adminName={adminName}
    />
  );
}
