import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

type Body = {
  current_password?: string;
  new_password?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const meta = user.app_metadata as { role?: string };
  if (meta.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const current = (body.current_password ?? "").trim();
  const next    = (body.new_password ?? "").trim();
  if (!current || !next) return NextResponse.json({ error: "Both current and new password required" }, { status: 400 });
  if (next.length < 8)   return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  if (next === current)  return NextResponse.json({ error: "New password must differ from current" }, { status: 400 });
  if (!user.email)       return NextResponse.json({ error: "No email on file" }, { status: 500 });

  // Verify current password via signin (does not establish a new session, we use a throwaway client).
  const admin = createSupabaseAdminClient();
  const { error: signinErr } = await admin.auth.signInWithPassword({ email: user.email, password: current });
  if (signinErr) return NextResponse.json({ error: "Current password is wrong" }, { status: 401 });

  const { error: updErr } = await admin.auth.admin.updateUserById(user.id, { password: next });
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
