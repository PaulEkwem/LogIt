import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Escape hatch: visiting /signout always clears the session and redirects to login.
 * Useful when the UI is broken or you need to forcibly drop a session from the address bar.
 */
export default async function SignoutPage() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
