import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SYNTH_DOMAIN = "logit.invalid";

/**
 * AM login: { code, pin } → signInWithPassword({ email: `<code>@logit.invalid`, password: pin })
 * On success, session cookies are set by the @supabase/ssr cookies adapter.
 */
export async function POST(request: Request) {
  let body: { code?: string; pin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const code = (body.code ?? "").trim();
  const pin = (body.pin ?? "").trim();

  if (!/^\d{4}$/.test(code)) {
    return NextResponse.json({ error: "Code must be 4 digits." }, { status: 400 });
  }
  if (code === "3000") {
    return NextResponse.json({ error: "Use the admin sign-in for code 3000." }, { status: 400 });
  }
  if (!pin) {
    return NextResponse.json({ error: "PIN required." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: `${code}@${SYNTH_DOMAIN}`,
    password: pin,
  });

  if (error) {
    return NextResponse.json({ error: "Code or PIN is wrong." }, { status: 401 });
  }

  // Fetch the AM profile + PC + division (RLS will scope to caller).
  const { data: am } = await supabase
    .from("account_managers")
    .select("id, full_name, am_code, initials, color, daily_goal, pc:pcs(id, name, pc_code, division:divisions(id, name))")
    .eq("am_code", code)
    .single();

  return NextResponse.json({ ok: true, am });
}
