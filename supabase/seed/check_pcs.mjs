// Quick sanity check — list every PC name + code in the division.
//
//   node supabase/seed/check_pcs.mjs

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
if (!url || !key) { console.error("Missing env"); process.exit(1); }

const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const { data, error } = await sb
  .from("pcs")
  .select("pc_code, name, division_id, archived_at")
  .order("name");

if (error) { console.error(error); process.exit(1); }

console.log("PCs in database:");
for (const p of data ?? []) {
  console.log(`  ${p.pc_code} | name="${p.name}" | div=${p.division_id?.slice(0, 8) ?? "—"} ${p.archived_at ? "(archived)" : ""}`);
}
console.log(`Total: ${(data ?? []).length}`);

// Also list admin's app_metadata
const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
const admin = list?.users?.find((u) => u.email === "admin@logit.invalid");
if (admin) {
  console.log("\nAdmin (Blessing) app_metadata:");
  console.log(JSON.stringify(admin.app_metadata, null, 2));
}
