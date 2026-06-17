import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RetentionTallyFlow } from "@/components/RetentionTallyFlow";
import { lagosDate } from "@/lib/time";

export const dynamic = "force-dynamic";

type RouteProps = {
  searchParams: Promise<{ slot?: string }>;
};

export default async function RetentionPage({ searchParams }: RouteProps) {
  const { slot: slotParam } = await searchParams;
  const requestedSlot: "midday" | "eod" | null =
    slotParam === "midday" ? "midday" : slotParam === "eod" ? "eod" : null;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const meta = user.app_metadata as { role?: string; am_id?: string; pc_id?: string };
  if (meta.role === "admin" || !meta.am_id || !meta.pc_id) redirect("/admin");

  const today = lagosDate();

  const { data: pc } = await supabase
    .from("pcs").select("name, pc_code, division_id")
    .eq("id", meta.pc_id).single();

  if (!pc) redirect("/home");

  // Look up which retention slots are currently open.
  const { data: windows } = await supabase
    .from("report_windows")
    .select("slot, opened_at, closed_at")
    .eq("division_id", pc.division_id)
    .eq("report_type", "retention")
    .eq("report_date", today);

  const eodOpen    = (windows ?? []).some((w) => w.slot === "eod"    && w.opened_at && !w.closed_at);
  const middayOpen = (windows ?? []).some((w) => w.slot === "midday" && w.opened_at && !w.closed_at);

  // Honour ?slot=<midday|eod> if the requested slot is actually open.
  // Otherwise fall back to whichever single slot is open. If neither, bounce.
  let slot: "midday" | "eod" | null = null;
  if (requestedSlot === "midday" && middayOpen) slot = "midday";
  else if (requestedSlot === "eod" && eodOpen)  slot = "eod";
  else if (middayOpen && !eodOpen) slot = "midday";
  else if (eodOpen && !middayOpen) slot = "eod";
  else if (middayOpen && eodOpen)  slot = "midday"; // both open and no preference → default to midday

  if (!slot) redirect("/home"); // no retention window open — bounce back

  const { data: me } = await supabase
    .from("account_managers").select("full_name").eq("id", meta.am_id).single();

  const { data: row } = await supabase
    .from("retention_reports")
    .select("pledges_naira_m, inflow_naira_m, outflow_naira_m, retention_naira_m, filled_by_am_id, submitted_at")
    .eq("pc_id", meta.pc_id)
    .eq("report_date", today)
    .eq("slot", slot)
    .maybeSingle();

  let existing = null;
  if (row) {
    const { data: filler } = await supabase
      .from("account_managers").select("full_name, initials, color")
      .eq("id", row.filled_by_am_id).maybeSingle();
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
      slot={slot}
      pcName={pc.name ?? ""}
      pcCode={pc.pc_code ?? ""}
      amName={me?.full_name ?? "you"}
      existing={existing}
    />
  );
}
