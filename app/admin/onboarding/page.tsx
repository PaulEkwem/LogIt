import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminOnboarding } from "@/components/AdminOnboarding";

export const dynamic = "force-dynamic";

export default async function AdminOnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const meta = user.app_metadata as { role?: string; division_id?: string; onboarding_completed?: boolean };
  if (meta.role !== "admin") redirect("/home");
  if (meta.onboarding_completed) redirect("/admin");

  const userMeta = user.user_metadata as { first_name?: string; last_name?: string };

  let divisionName = "";
  if (meta.division_id) {
    const { data } = await supabase.from("divisions").select("name").eq("id", meta.division_id).maybeSingle();
    divisionName = data?.name ?? "";
  }

  return (
    <AdminOnboarding
      initialFirstName={userMeta.first_name ?? ""}
      initialLastName={userMeta.last_name ?? ""}
      divisionName={divisionName}
    />
  );
}
