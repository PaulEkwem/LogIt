import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AmOnboarding } from "@/components/AmOnboarding";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const meta = user.app_metadata as { role?: string; am_id?: string };
  if (meta.role === "admin") redirect("/admin/onboarding");
  if (meta.role !== "am" || !meta.am_id) redirect("/");

  const { data: am } = await supabase
    .from("account_managers")
    .select("id, am_code, first_name, last_name, team_label, onboarding_completed, pc:pcs(id, name, pc_code, division:divisions(id, name))")
    .eq("id", meta.am_id)
    .single();

  if (!am) redirect("/");
  if (am.onboarding_completed) redirect("/home");

  // @ts-expect-error supabase nested select typing
  const pc = am.pc as { id: string; name: string; pc_code: string; division: { id: string; name: string } };
  const userMeta = user.user_metadata as { first_name?: string; last_name?: string; team_label?: string };

  return (
    <AmOnboarding
      amCode={am.am_code}
      initialFirstName={am.first_name ?? userMeta.first_name ?? ""}
      initialLastName={am.last_name ?? userMeta.last_name ?? ""}
      initialTeamLabel={am.team_label ?? userMeta.team_label ?? null}
      pc={{ id: pc.id, name: pc.name, pc_code: pc.pc_code }}
      division={{ id: pc.division.id, name: pc.division.name }}
    />
  );
}
