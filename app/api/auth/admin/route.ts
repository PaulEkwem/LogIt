import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SYNTH_DOMAIN = "logit.invalid";
const ADMIN_CODE = "3000";

/**
 * Admin login: { password } → signInWithPassword({ email: `admin@logit.invalid`, password })
 * Caller must have already entered code 3000 on the client to reach this endpoint.
 */
export async function POST(request: Request) {
  let body: { code?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.code !== ADMIN_CODE) {
    return NextResponse.json({ error: "Admin code mismatch." }, { status: 400 });
  }
  const password = (body.password ?? "").trim();
  if (!password) {
    return NextResponse.json({ error: "Password required." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: `admin@${SYNTH_DOMAIN}`,
    password,
  });

  if (error) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
