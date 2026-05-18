// Seed script — creates demo division + PC + AMs + admin.
// Run with: node supabase/seed/seed.mjs
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env (or .env.local).

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Load .env.local manually (no dotenv dep).
try {
  const env = readFileSync(".env.local", "utf8");
  env.split("\n").forEach((line) => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  });
} catch {
  /* .env.local optional */
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const SYNTH_DOMAIN = "logit.invalid";
const PIN = "1234";              // demo PIN for all AMs — admin should rotate in production
const ADMIN_PWD = "admin2026";

const DIVISION = "SME Lagos Mainland";
const PC = { name: "SME MBA", code: "482" };
const AMS = [
  { code: "4821", full_name: "Adaeze Okonkwo",    initials: "AO", color: "#CE1126", daily_goal: 15 },
  { code: "4822", full_name: "Chukwuemeka Obi",   initials: "CO", color: "#4F46E5", daily_goal: 18 },
  { code: "4823", full_name: "Fatima Aliyu",      initials: "FA", color: "#059669", daily_goal: 15 },
  { code: "4824", full_name: "Babatunde Adeyemi", initials: "BA", color: "#7C3AED", daily_goal: 12 },
  { code: "4825", full_name: "Ngozi Eze",         initials: "NE", color: "#0284C7", daily_goal: 10 },
  { code: "4826", full_name: "Seun Badmus",       initials: "SB", color: "#D97706", daily_goal: 10 },
];

async function upsertAuthUser({ email, password, app_metadata }) {
  // Try to find existing
  const { data: existing } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = existing?.users?.find((u) => u.email === email);
  if (found) {
    await sb.auth.admin.updateUserById(found.id, { password, app_metadata });
    return found.id;
  }
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata,
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  console.log("→ Division");
  let { data: division } = await sb.from("divisions").select("*").eq("name", DIVISION).maybeSingle();
  if (!division) {
    const ins = await sb.from("divisions").insert({ name: DIVISION }).select().single();
    if (ins.error) throw ins.error;
    division = ins.data;
  }
  console.log("  ", division.id, division.name);

  console.log("→ PC");
  let { data: pc } = await sb.from("pcs").select("*").eq("pc_code", PC.code).maybeSingle();
  if (!pc) {
    const ins = await sb.from("pcs").insert({ name: PC.name, pc_code: PC.code, division_id: division.id }).select().single();
    if (ins.error) throw ins.error;
    pc = ins.data;
  }
  console.log("  ", pc.id, pc.name, "PC", pc.pc_code);

  console.log("→ Admin auth user");
  const adminId = await upsertAuthUser({
    email: `admin@${SYNTH_DOMAIN}`,
    password: ADMIN_PWD,
    app_metadata: { role: "admin", pc_id: pc.id },
  });
  console.log("  ", adminId, `admin@${SYNTH_DOMAIN}`);

  console.log("→ AMs");
  for (const am of AMS) {
    const email = `${am.code}@${SYNTH_DOMAIN}`;
    const userId = await upsertAuthUser({
      email,
      password: PIN,
      app_metadata: { role: "am", am_code: am.code, pc_id: pc.id },
    });

    // Upsert AM row
    const { data: amRow, error: amErr } = await sb
      .from("account_managers")
      .upsert(
        {
          pc_id: pc.id,
          auth_user_id: userId,
          full_name: am.full_name,
          am_code: am.code,
          initials: am.initials,
          color: am.color,
          daily_goal: am.daily_goal,
        },
        { onConflict: "am_code" },
      )
      .select()
      .single();
    if (amErr) throw amErr;

    // Update auth user with am_id (chicken-and-egg fix)
    await sb.auth.admin.updateUserById(userId, {
      app_metadata: { role: "am", am_code: am.code, pc_id: pc.id, am_id: amRow.id },
    });

    console.log("  ", am.code, am.full_name);
  }

  console.log("");
  console.log("Demo credentials:");
  console.log("  AM:    code 4821..4826, PIN 1234");
  console.log("  Admin: code 3000, password admin2026");
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
