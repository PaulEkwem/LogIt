import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TallyFlow } from "@/components/TallyFlow";
import { lagosDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const meta = user.app_metadata as { role?: string; am_id?: string; pc_id?: string };
  if (meta.role === "admin" || !meta.am_id || !meta.pc_id) redirect("/admin");

  const today = lagosDate();

  const { data: pc } = await supabase
    .from("pcs").select("division_id").eq("id", meta.pc_id).single();

  // Must have an open acquisition window for today.
  const { data: window } = await supabase
    .from("report_windows")
    .select("opened_at, closed_at")
    .eq("division_id", pc?.division_id ?? "")
    .eq("report_type", "acquisition")
    .eq("report_date", today)
    .eq("slot", "single")
    .maybeSingle();

  const open = !!window?.opened_at && !window?.closed_at;
  if (!open) redirect("/home");

  const { data: existing } = await supabase
    .from("daily_reports")
    .select("acquired, opened_same_day")
    .eq("am_id", meta.am_id)
    .eq("report_date", today)
    .maybeSingle();

  return <TallyFlow existing={existing ?? null} />;
}
