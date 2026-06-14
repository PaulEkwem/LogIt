import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { passwordFromPin } from "@/lib/pin";

type Action = "create" | "rename" | "archive" | "restore" | "reset_pin";

type Body = {
  action?: Action;
  am_id?: string;
  pc_id?: string;
  first_name?: string;
  last_name?: string;
  am_code?: string;
};

const SYNTH_DOMAIN = "logit.invalid";
const DEFAULT_PIN = "1234";
const PALETTE = [
  "#CE1126", "#4F46E5", "#059669", "#7C3AED", "#0284C7", "#D97706",
  "#DB2777", "#0891B2", "#65A30D", "#9333EA", "#EA580C", "#0D9488",
];
function colorFor(code: string): string {
  return PALETTE[Number(code) % PALETTE.length] ?? PALETTE[0];
}
function initialsFor(first: string, last: string): string {
  return ((first?.[0] ?? "") + (last?.[0] ?? "")).toUpperCase() || "AM";
}

export async function POST(request: Request) {
  let body: Body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const meta = user.app_metadata as { role?: string; division_id?: string };
  if (meta.role !== "admin" || !meta.division_id) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  switch (body.action) {
    case "create": {
      const first = (body.first_name ?? "").trim();
      const last = (body.last_name ?? "").trim();
      const code = (body.am_code ?? "").trim();
      const pcId = body.pc_id ?? "";

      if (!first) return NextResponse.json({ error: "First name required" }, { status: 400 });
      if (!pcId)  return NextResponse.json({ error: "Team required" }, { status: 400 });
      if (!/^\d{4}$/.test(code)) return NextResponse.json({ error: "AM code must be 4 digits" }, { status: 400 });
      if (code === "3000") return NextResponse.json({ error: "Code 3000 is reserved for admin" }, { status: 400 });

      // Verify PC belongs to admin's division.
      const { data: pc } = await admin.from("pcs").select("id, pc_code, division_id").eq("id", pcId).maybeSingle();
      if (!pc || pc.division_id !== meta.division_id) {
        return NextResponse.json({ error: "Team not found in your division" }, { status: 404 });
      }
      // Soft enforcement: AM code should start with PC code (warn but accept — Blessing types manually for HQ-assigned codes).
      // We only hard-reject duplicates.
      const { data: dupAm } = await admin.from("account_managers").select("id").eq("am_code", code).maybeSingle();
      if (dupAm) return NextResponse.json({ error: `AM code ${code} is already in use` }, { status: 409 });

      // Create auth user
      const email = `${code}@${SYNTH_DOMAIN}`;
      const { data: created, error: authErr } = await admin.auth.admin.createUser({
        email,
        password: passwordFromPin(DEFAULT_PIN),
        email_confirm: true,
        app_metadata: {
          role: "am",
          am_code: code,
          pc_id: pcId,
          onboarding_completed: false,
        },
        user_metadata: {
          first_name: first,
          last_name: last,
          team_label: pc.pc_code === code.slice(0, 3) ? "" : pc.pc_code, // mark if borrowing
        },
      });
      if (authErr || !created) return NextResponse.json({ error: authErr?.message ?? "Auth create failed" }, { status: 500 });

      const full_name = [first, last].filter(Boolean).join(" ") || first;
      const { data: amRow, error: amErr } = await admin
        .from("account_managers")
        .insert({
          pc_id: pcId,
          auth_user_id: created.user.id,
          full_name,
          first_name: first,
          last_name: last || null,
          am_code: code,
          initials: initialsFor(first, last),
          color: colorFor(code),
          daily_goal: 15,
          onboarding_completed: false,
        })
        .select("id").single();
      if (amErr || !amRow) {
        // Roll back the auth user so we don't leave an orphan.
        await admin.auth.admin.deleteUser(created.user.id);
        return NextResponse.json({ error: amErr?.message ?? "AM insert failed" }, { status: 500 });
      }

      // Patch JWT with the AM row id (chicken-and-egg).
      await admin.auth.admin.updateUserById(created.user.id, {
        app_metadata: {
          role: "am",
          am_code: code,
          pc_id: pcId,
          am_id: amRow.id,
          onboarding_completed: false,
        },
      });

      return NextResponse.json({ ok: true, am_id: amRow.id });
    }

    case "rename": {
      const first = (body.first_name ?? "").trim();
      const last  = (body.last_name  ?? "").trim();
      if (!body.am_id || !first) return NextResponse.json({ error: "am_id and first_name required" }, { status: 400 });
      const full_name = [first, last].filter(Boolean).join(" ") || first;
      const { error } = await admin
        .from("account_managers")
        .update({
          first_name: first,
          last_name: last || null,
          full_name,
          initials: initialsFor(first, last),
        })
        .eq("id", body.am_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "archive": {
      if (!body.am_id) return NextResponse.json({ error: "am_id required" }, { status: 400 });
      const { error } = await admin
        .from("account_managers")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", body.am_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "restore": {
      if (!body.am_id) return NextResponse.json({ error: "am_id required" }, { status: 400 });
      const { error } = await admin
        .from("account_managers")
        .update({ archived_at: null }).eq("id", body.am_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "reset_pin": {
      if (!body.am_id) return NextResponse.json({ error: "am_id required" }, { status: 400 });
      const { data: am } = await admin
        .from("account_managers").select("auth_user_id").eq("id", body.am_id).maybeSingle();
      if (!am?.auth_user_id) return NextResponse.json({ error: "Auth user not found" }, { status: 404 });

      // Re-arm onboarding flag and reset password to padded default PIN.
      const { data: existing } = await admin.auth.admin.getUserById(am.auth_user_id);
      const prevMeta = existing?.user?.app_metadata ?? {};

      const pwErr = await admin.auth.admin.updateUserById(am.auth_user_id, {
        password: passwordFromPin(DEFAULT_PIN),
        app_metadata: { ...prevMeta, onboarding_completed: false },
      });
      if (pwErr.error) return NextResponse.json({ error: pwErr.error.message }, { status: 500 });

      await admin
        .from("account_managers").update({ onboarding_completed: false }).eq("id", body.am_id);

      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "action must be create|rename|archive|restore|reset_pin" }, { status: 400 });
  }
}
