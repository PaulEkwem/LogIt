import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TallyFlow } from "@/components/TallyFlow";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const meta = user.app_metadata as { role?: string; am_id?: string };
  if (meta.role === "admin" || !meta.am_id) redirect("/admin");

  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("daily_reports")
    .select("acquired, opened_same_day")
    .eq("am_id", meta.am_id)
    .eq("report_date", today)
    .maybeSingle();

  return <TallyFlow existing={existing ?? null} />;
}
