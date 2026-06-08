import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { passwordFromPin } from "@/lib/pin";

/**
 * AM onboarding completion.
 * Body: { first_name, last_name, team_label, new_pin } (4-digit PIN, must differ from 1234)
 * Updates account_managers row, auth user password, and app_metadata.onboarding_completed.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const meta = user.app_metadata as { role?: string; am_id?: string; am_code?: string };
  if (meta.role !== "am" || !meta.am_id) {
    return NextResponse.json({ error: "Not an AM account" }, { status: 403 });
  }

  let body: { first_name?: string; last_name?: string; team_label?: string; new_pin?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const first_name = (body.first_name ?? "").trim();
  const last_name  = (body.last_name  ?? "").trim();
  const team_label = (body.team_label ?? "").trim() || null;
  const new_pin    = (body.new_pin    ?? "").trim();

  if (!first_name) return NextResponse.json({ error: "First name required" }, { status: 400 });
  if (!/^\d{4}$/.test(new_pin)) return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
  if (new_pin === "1234") return NextResponse.json({ error: "Pick a new PIN, not the default" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const full_name = [first_name, last_name].filter(Boolean).join(" ");
  const initials = ((first_name[0] ?? "") + (last_name[0] ?? "")).toUpperCase() || "AM";

  const { error: amErr } = await admin
    .from("account_managers")
    .update({
      first_name,
      last_name: last_name || null,
      team_label,
      full_name: full_name || first_name,
      initials,
      onboarding_completed: true,
    })
    .eq("id", meta.am_id);
  if (amErr) return NextResponse.json({ error: amErr.message }, { status: 500 });

  const { error: pwErr } = await admin.auth.admin.updateUserById(user.id, {
    password: passwordFromPin(new_pin),
    app_metadata: { ...user.app_metadata, onboarding_completed: true },
  });
  if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 500 });

  // Refresh the session so the new app_metadata is picked up by middleware.
  await supabase.auth.refreshSession();

  return NextResponse.json({ ok: true });
}
