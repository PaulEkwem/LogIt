// LogIt — emergency PIN reset for an AM who's locked out.
//
//   node supabase/seed/reset_pin.mjs <am_code>
//
// Resets the AM's password back to the default 1234 (stored padded as
// "lgt-1234") and flips onboarding_completed back to false so they're
// forced through the onboarding flow again — the only place they can pick
// a fresh non-default PIN.
//
// The pre-filled name + team carry over from the AM row, so they'll just
// tap-tap-tap through steps 1 and 2 and set a new PIN in step 3.

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

const code = (process.argv[2] ?? "").trim();
if (!/^\d{4}$/.test(code)) {
  console.error("Usage: node supabase/seed/reset_pin.mjs <4-digit am_code>");
  console.error("Example: node supabase/seed/reset_pin.mjs 3125");
  process.exit(1);
}
if (code === "3000") {
  console.error("Code 3000 is the admin. Use a separate flow to reset the admin password.");
  process.exit(1);
}

const SYNTH_DOMAIN = "logit.invalid";
const PIN_PREFIX = "lgt-";
const DEFAULT_PIN = "1234";

const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const email = `${code}@${SYNTH_DOMAIN}`;

  console.log(`→ Looking up auth user ${email}`);
  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = list?.users?.find((u) => u.email === email);
  if (!user) {
    console.error(`  ✗ No auth user with email ${email}. Did you run the seed?`);
    process.exit(1);
  }

  console.log(`→ Looking up AM row for code ${code}`);
  const { data: am, error: amErr } = await sb
    .from("account_managers")
    .select("id, full_name, first_name")
    .eq("am_code", code)
    .single();
  if (amErr || !am) {
    console.error(`  ✗ No account_managers row with am_code ${code}.`);
    process.exit(1);
  }

  console.log(`→ Resetting password + onboarding flag for ${am.full_name || am.first_name}`);
  const newAppMeta = {
    ...(user.app_metadata ?? {}),
    onboarding_completed: false,
  };
  const { error: pwErr } = await sb.auth.admin.updateUserById(user.id, {
    password: `${PIN_PREFIX}${DEFAULT_PIN}`,
    app_metadata: newAppMeta,
  });
  if (pwErr) {
    console.error(`  ✗ Auth update failed: ${pwErr.message}`);
    process.exit(1);
  }

  const { error: amUpdErr } = await sb
    .from("account_managers")
    .update({ onboarding_completed: false })
    .eq("id", am.id);
  if (amUpdErr) {
    console.error(`  ✗ account_managers update failed: ${amUpdErr.message}`);
    process.exit(1);
  }

  console.log("");
  console.log(`Done. ${am.full_name || am.first_name} can now sign in with:`);
  console.log(`  Code: ${code}`);
  console.log(`  PIN:  ${DEFAULT_PIN}`);
  console.log(`They'll be sent through onboarding again to pick a fresh PIN.`);
}

main().catch((e) => { console.error("Reset failed:", e); process.exit(1); });
