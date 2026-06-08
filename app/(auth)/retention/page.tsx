import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RetentionTallyFlow } from "@/components/RetentionTallyFlow";

export const dynamic = "force-dynamic";

export default async function RetentionPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const meta = user.app_metadata as { role?: string; am_id?: string; pc_id?: string };
  if (meta.role === "admin" || !meta.am_id || !meta.pc_id) redirect("/admin");

  const today = new Date().toISOString().slice(0, 10);

  const { data: pc } = await supabase
    .from("pcs")
    .select("name, pc_code")
    .eq("id", meta.pc_id)
    .single();

  const { data: me } = await supabase
    .from("account_managers")
    .select("full_name")
    .eq("id", meta.am_id)
    .single();

  const { data: row } = await supabase
    .from("retention_reports")
    .select("pledges_naira_m, inflow_naira_m, outflow_naira_m, retention_naira_m, filled_by_am_id, submitted_at")
    .eq("pc_id", meta.pc_id)
    .eq("report_date", today)
    .maybeSingle();

  let existing = null;
  if (row) {
    const { data: filler } = await supabase
      .from("account_managers")
      .select("full_name, initials, color")
      .eq("id", row.filled_by_am_id)
      .maybeSingle();
    existing = {
      pledges_naira_m:   Number(row.pledges_naira_m),
      inflow_naira_m:    Number(row.inflow_naira_m),
      outflow_naira_m:   Number(row.outflow_naira_m),
      retention_naira_m: Number(row.retention_naira_m),
      filled_by_name:     filler?.full_name ?? "a teammate",
      filled_by_initials: filler?.initials ?? "?",
      filled_by_color:    filler?.color ?? "#94A3B8",
      submitted_at:       row.submitted_at,
    };
  }

  return (
    <RetentionTallyFlow
      pcName={pc?.name ?? ""}
      pcCode={pc?.pc_code ?? ""}
      amName={me?.full_name ?? "you"}
      existing={existing}
    />
  );
}
