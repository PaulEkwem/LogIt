import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { TabNav } from "@/components/TabNav";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const meta = user.app_metadata as { role?: string; am_id?: string; pc_id?: string };
  if (meta.role === "admin") redirect("/admin");
  if (!meta.am_id) redirect("/");

  const { data: am } = await supabase
    .from("account_managers")
    .select("id, full_name, am_code, initials, color, daily_goal, pc:pcs(id, name, pc_code, division:divisions(id, name))")
    .eq("id", meta.am_id)
    .single();

  if (!am) redirect("/");

  // Streak + total XP via RPC + aggregate
  const { data: streakData } = await supabase.rpc("current_streak", { target_am_id: am.id });
  const { data: xpRows } = await supabase
    .from("xp_ledger")
    .select("amount")
    .eq("am_id", am.id);
  const totalXp = (xpRows ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
  const streak = typeof streakData === "number" ? streakData : 0;

  const firstName = am.full_name.split(" ")[0];
  // @ts-expect-error supabase nested select typing
  const pcName: string = am.pc?.name ?? "";
  // @ts-expect-error supabase nested select typing
  const pcCode: string = am.pc?.pc_code ?? "";
  // @ts-expect-error supabase nested select typing
  const divisionName: string = am.pc?.division?.name ?? "";

  return (
    <>
      <Header
        firstName={firstName}
        fullName={am.full_name}
        amCode={am.am_code}
        initials={am.initials}
        avatarColor={am.color}
        pcName={pcName}
        pcCode={pcCode}
        divisionName={divisionName}
        streak={streak}
        xp={totalXp}
      />
      <main className="px-4 pt-5" style={{ paddingBottom: 110 }}>
        {children}
      </main>
      <TabNav />
    </>
  );
}
