import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Admin onboarding completion.
 * Body: { first_name, last_name, new_password } (min 8 chars, must differ from default)
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const meta = user.app_metadata as { role?: string };
  if (meta.role !== "admin") {
    return NextResponse.json({ error: "Not an admin account" }, { status: 403 });
  }

  let body: { first_name?: string; last_name?: string; new_password?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const first_name = (body.first_name ?? "").trim();
  const last_name  = (body.last_name  ?? "").trim();
  const new_password = (body.new_password ?? "").trim();

  if (!first_name) return NextResponse.json({ error: "First name required" }, { status: 400 });
  if (new_password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  if (new_password === "admin2026") return NextResponse.json({ error: "Pick a new password, not the default" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: new_password,
    app_metadata: { ...user.app_metadata, onboarding_completed: true },
    user_metadata: { ...user.user_metadata, first_name, last_name },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.auth.refreshSession();

  return NextResponse.json({ ok: true });
}
