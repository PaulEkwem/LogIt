// LogIt — wipe test data + reset every user back to first-login state.
//
//   node supabase/seed/reset_for_launch.mjs            (default: wipe data + reset users)
//   node supabase/seed/reset_for_launch.mjs --data-only   (only wipe report data)
//   node supabase/seed/reset_for_launch.mjs --users-only  (only re-arm users)
//
// DESTRUCTIVE — drops every daily_reports / retention_reports / report_windows
// row and resets every user's password back to the seed default.
//
// User state after run:
//   • AM: PIN reset to 1234. onboarding_completed = false. first_name /
//     last_name / team_label stay pre-filled (only steps 1+2 of onboarding
//     are "tap confirm", step 3 picks a new PIN).
//   • Admin (Blessing): password reset to admin2026. Same onboarding flow.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

try {
  const env = readFileSync(".env.local", "utf8");
  env.split("\n").forEach((line) => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  });
} catch { /* .env.local optional */ }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const args = process.argv.slice(2);
const dataOnly  = args.includes("--data-only");
const usersOnly = args.includes("--users-only");
const doData  = !usersOnly;
const doUsers = !dataOnly;

const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const SYNTH_DOMAIN = "logit.invalid";
const PIN_PREFIX = "lgt-";
const DEFAULT_PIN = "1234";
const ADMIN_PWD = "admin2026";
const passwordFromPin = (pin) => `${PIN_PREFIX}${pin}`;

async function wipeData() {
  console.log("→ Wiping report data");
  // Order: child tables first to avoid FK violations. Use a very loose filter
  // (`id` not null) so we hit every row.
  const tables = [
    ["xp_ledger", "id"],
    ["event_reports", "id"],
    ["daily_reports", "id"],
    ["retention_reports", "id"],
    ["report_windows", "id"],
  ];
  for (const [name, idCol] of tables) {
    const { error, count } = await sb.from(name).delete({ count: "exact" }).not(idCol, "is", null);
    if (error) {
      console.error(`   ✗ ${name}: ${error.message}`);
    } else {
      console.log(`   ${name}: ${count ?? 0} rows deleted`);
    }
  }
}

async function resetUsers() {
  console.log("→ Resetting all users to first-login state");

  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = list?.users ?? [];

  let resetCount = 0;
  for (const u of users) {
    if (!u.email || !u.email.endsWith(`@${SYNTH_DOMAIN}`)) continue;
    const code = u.email.replace(`@${SYNTH_DOMAIN}`, "");
    const isAdmin = code === "admin";

    const password = isAdmin ? ADMIN_PWD : passwordFromPin(DEFAULT_PIN);
    const nextAppMeta = { ...(u.app_metadata ?? {}), onboarding_completed: false };

    const { error } = await sb.auth.admin.updateUserById(u.id, {
      password,
      app_metadata: nextAppMeta,
    });
    if (error) {
      console.error(`   ✗ ${code}: ${error.message}`);
      continue;
    }

    // Mirror onboarding flag in account_managers (admin lives only in auth)
    if (!isAdmin) {
      await sb.from("account_managers").update({ onboarding_completed: false }).eq("am_code", code);
    }
    resetCount++;
  }
  console.log(`   ${resetCount} users reset`);
  console.log("");
  console.log("Defaults:");
  console.log("   Admin: code 3000, password admin2026");
  console.log("   AMs:   each AM's code, PIN 1234");
}

async function main() {
  console.log("LogIt reset for launch");
  console.log(`  Data wipe: ${doData ? "YES" : "no"}`);
  console.log(`  User reset: ${doUsers ? "YES" : "no"}`);
  console.log("");
  if (doData)  await wipeData();
  if (doUsers) await resetUsers();
  console.log("");
  console.log("Done.");
}

main().catch((e) => { console.error("Reset failed:", e); process.exit(1); });
