import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LoginScreen } from "@/components/LoginScreen";

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const role = (user.app_metadata as { role?: string }).role;
    redirect(role === "admin" ? "/admin" : "/home");
  }

  return <LoginScreen />;
}
