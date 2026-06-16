import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminSettings } from "@/components/admin/AdminSettings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const meta = user!.user_metadata as { first_name?: string; last_name?: string };
  const full_name = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || "Admin";
  const email = user!.email ?? "";

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Settings" sub="Your admin account" />
      <AdminSettings full_name={full_name} email={email} />
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
