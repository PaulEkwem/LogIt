// LogIt — real-user seed for SME LAGOS MAINLAND DIVISION 1.
//
//   node supabase/seed/seed_real.mjs
//
// Idempotent: re-running upserts by pc_code / am_code / synthetic email.
// Onboarding is blocking: every account starts with onboarding_completed=false
// and first_name pre-filled. AMs/admin confirm details + change PIN on first login.

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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const SYNTH_DOMAIN = "logit.invalid";
const PIN = "1234";
const ADMIN_PWD = "admin2026";

// Mirror of lib/pin.ts — Supabase enforces a 6-char min password length,
// so we pad the 4-digit PIN before storing. The login API does the same.
const PIN_PREFIX = "lgt-";
const passwordFromPin = (pin) => `${PIN_PREFIX}${pin}`;

const DIVISION = "SME LAGOS MAINLAND DIVISION 1";

// ============================================================================
// PCs — full team name + 3-digit PC code.
// ============================================================================
const PCS = [
  { code: "118", name: "Abule Egba" },
  { code: "320", name: "Adeniyi Jones" },
  { code: "302", name: "Alausa" },
  { code: "311", name: "Allen" },
  { code: "357", name: "Amuwo" },
  { code: "344", name: "Apapa" },
  { code: "364", name: "Bode Thomas" },
  { code: "208", name: "Ibafon" },
  { code: "304", name: "Ikosi" },
  { code: "207", name: "Ikotun 2" },
  { code: "377", name: "Ilupeju" },
  { code: "206", name: "Ipaja" },
  { code: "115", name: "Lasu" },
  { code: "312", name: "MBA" },
  { code: "116", name: "MM Way Yaba" },
  { code: "316", name: "Ogba" },
  { code: "341", name: "Okota" },
  { code: "385", name: "Orile" },
  { code: "375", name: "Yaba" },
];

// Codes from previous seeds that are no longer in use. We delete the auth
// users so they can't sign in with the old credentials.
const RETIRED_CODES = ["3122", "3125"];

// ============================================================================
// AMs — fill from spreadsheet. Each entry:
//   { code, first_name, last_name, pc_code, team_label?, color?, daily_goal? }
//
// Rules:
//   • am_code = PC code + 1 digit
//   • team_label only when AM is *borrowing* another team's PC code
//     (e.g., Paul is on Ipaja but uses MBA's 312 → team_label: "Ipaja")
//   • color defaults to a generated palette colour if omitted
//   • daily_goal defaults to 15 if omitted
// ============================================================================
const AMS = [
  // PC 118 — Abule Egba
  { code: "1181", first_name: "Janet",     last_name: "",        pc_code: "118" },

  // PC 320 — Adeniyi Jones
  { code: "3202", first_name: "Azeezat",   last_name: "",        pc_code: "320" },
  { code: "3203", first_name: "Fatima",    last_name: "",        pc_code: "320" },
  { code: "3204", first_name: "Tobi",      last_name: "",        pc_code: "320" },

  // PC 302 — Alausa
  { code: "3021", first_name: "Bode",      last_name: "",        pc_code: "302" },
  { code: "3024", first_name: "Damilola",  last_name: "",        pc_code: "302" },
  { code: "3025", first_name: "Tijani",    last_name: "",        pc_code: "302" },

  // PC 311 — Allen
  { code: "3111", first_name: "Abiodun",   last_name: "",        pc_code: "311" },
  { code: "3112", first_name: "Tomisin",   last_name: "",        pc_code: "311" },
  { code: "3113", first_name: "Kelvin",    last_name: "",        pc_code: "311" },

  // PC 357 — Amuwo
  { code: "3572", first_name: "Chizoba",   last_name: "",        pc_code: "357" },
  { code: "3573", first_name: "Ekom",      last_name: "",        pc_code: "357" },
  { code: "3574", first_name: "Oyinda",    last_name: "",        pc_code: "357" },

  // PC 344 — Apapa
  { code: "3441", first_name: "Aliya",     last_name: "",        pc_code: "344" },
  { code: "3442", first_name: "Chukwudi",  last_name: "",        pc_code: "344" },
  { code: "3444", first_name: "Goodnews",  last_name: "",        pc_code: "344" },

  // PC 364 — Bode Thomas
  { code: "3641", first_name: "Olajide",   last_name: "",        pc_code: "364" },
  { code: "3642", first_name: "Gbemi",     last_name: "",        pc_code: "364" },
  { code: "3644", first_name: "Joy",       last_name: "",        pc_code: "364" },

  // PC 304 — Ikosi
  { code: "3041", first_name: "Alimat",    last_name: "",        pc_code: "304" },
  { code: "3042", first_name: "Ayomide",   last_name: "",        pc_code: "304" },
  { code: "3044", first_name: "Gbemisola", last_name: "Kazeem",  pc_code: "304" },

  // PC 377 — Ilupeju
  { code: "3771", first_name: "Oloche",    last_name: "",        pc_code: "377" },
  { code: "3772", first_name: "Adewale",   last_name: "",        pc_code: "377" },
  { code: "3773", first_name: "Oluwaseun", last_name: "",        pc_code: "377" },

  // PC 115 — Lasu
  { code: "1151", first_name: "Opeyemi",   last_name: "",        pc_code: "115" },
  { code: "1153", first_name: "Olabisi",   last_name: "",        pc_code: "115" },

  // PC 312 — MBA
  { code: "3121", first_name: "Rhoda",     last_name: "",        pc_code: "312" },
  { code: "3124", first_name: "Idowu",     last_name: "",        pc_code: "312" },

  // PC 206 — Ipaja
  { code: "2061", first_name: "Paul",      last_name: "Ekwem",   pc_code: "206" },

  // PC 207 — Ikotun 2
  { code: "2071", first_name: "Ifunanya",  last_name: "",        pc_code: "207" },

  // PC 208 — Ibafon
  { code: "2081", first_name: "Chukwudi",  last_name: "",        pc_code: "208" },

  // PC 116 — MM Way Yaba
  { code: "1161", first_name: "Saheed",    last_name: "",        pc_code: "116" },

  // PC 316 — Ogba
  { code: "3161", first_name: "Gordon",    last_name: "",        pc_code: "316" },
  { code: "3163", first_name: "Samuel",    last_name: "",        pc_code: "316" },
  { code: "3164", first_name: "Chinenye",  last_name: "",        pc_code: "316" },

  // PC 341 — Okota
  { code: "3411", first_name: "Olawale",   last_name: "",        pc_code: "341" },
  { code: "3412", first_name: "Sunkami",   last_name: "",        pc_code: "341" },
  { code: "3414", first_name: "Millicent", last_name: "",        pc_code: "341" },

  // PC 385 — Orile
  { code: "3851", first_name: "Abiodun",   last_name: "Aremu",   pc_code: "385" },
  { code: "3852", first_name: "Ngozi",     last_name: "",        pc_code: "385" },
  { code: "3854", first_name: "Olabisi",   last_name: "",        pc_code: "385" },

  // PC 375 — Yaba
  { code: "3751", first_name: "Tumininu",  last_name: "",        pc_code: "375" },
  { code: "3754", first_name: "Esther",    last_name: "",        pc_code: "375" },
  { code: "3755", first_name: "Williams",  last_name: "",        pc_code: "375" },
];

// ============================================================================
// Palette — used when an AM entry omits `color`.
// ============================================================================
const PALETTE = [
  "#CE1126", "#4F46E5", "#059669", "#7C3AED", "#0284C7", "#D97706",
  "#DB2777", "#0891B2", "#65A30D", "#9333EA", "#EA580C", "#0D9488",
];
const colorFor = (code) => PALETTE[Number(code) % PALETTE.length];
const initialsFor = (first, last) =>
  ((first?.[0] ?? "") + (last?.[0] ?? "")).toUpperCase() || "AM";

// ============================================================================
// Helpers
// ============================================================================
async function upsertAuthUser({ email, password, app_metadata, user_metadata }) {
  const { data: existing } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = existing?.users?.find((u) => u.email === email);
  if (found) {
    // Preserve onboarding_completed if the user has already finished onboarding —
    // re-running the seed shouldn't kick a real user back through the flow.
    const prevOnboarded = (found.app_metadata && found.app_metadata.onboarding_completed) === true;
    const merged = { ...app_metadata };
    if (prevOnboarded) merged.onboarding_completed = true;
    await sb.auth.admin.updateUserById(found.id, { password, app_metadata: merged, user_metadata });
    return { id: found.id, preservedOnboarding: prevOnboarded };
  }
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata,
    user_metadata,
  });
  if (error) throw error;
  return { id: data.user.id, preservedOnboarding: false };
}

async function retireOldUsers() {
  if (RETIRED_CODES.length === 0) return;
  console.log(`→ Retiring old codes: ${RETIRED_CODES.join(", ")}`);
  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const code of RETIRED_CODES) {
    const email = `${code}@${SYNTH_DOMAIN}`;
    const found = list?.users?.find((u) => u.email === email);
    if (!found) {
      console.log(`   ${code}: no auth user, skipping`);
      continue;
    }
    // Delete AM row first (auth_user_id FK cascades on auth user delete, but
    // we also want to free up the am_code in case it's ever reused).
    await sb.from("account_managers").delete().eq("am_code", code);
    const { error } = await sb.auth.admin.deleteUser(found.id);
    if (error) {
      console.error(`   ${code}: failed to delete auth user — ${error.message}`);
    } else {
      console.log(`   ${code}: deleted`);
    }
  }
}

async function main() {
  await retireOldUsers();

  console.log("→ Division");
  let { data: division } = await sb.from("divisions").select("*").eq("name", DIVISION).maybeSingle();
  if (!division) {
    const ins = await sb.from("divisions").insert({ name: DIVISION }).select().single();
    if (ins.error) throw ins.error;
    division = ins.data;
  }
  console.log("  ", division.id, division.name);

  console.log("→ PCs");
  const pcByCode = {};
  for (const p of PCS) {
    let { data: pc } = await sb.from("pcs").select("*").eq("pc_code", p.code).maybeSingle();
    if (!pc) {
      const ins = await sb
        .from("pcs")
        .insert({ name: p.name, pc_code: p.code, division_id: division.id })
        .select().single();
      if (ins.error) throw ins.error;
      pc = ins.data;
    } else if (pc.name !== p.name || pc.division_id !== division.id) {
      const upd = await sb
        .from("pcs")
        .update({ name: p.name, division_id: division.id })
        .eq("id", pc.id).select().single();
      if (upd.error) throw upd.error;
      pc = upd.data;
    }
    pcByCode[p.code] = pc;
    console.log("  ", pc.pc_code, pc.name);
  }

  console.log("→ Admin (Blessing Awom, code 3000, division-wide)");
  const adminResult = await upsertAuthUser({
    email: `admin@${SYNTH_DOMAIN}`,
    password: ADMIN_PWD,
    app_metadata: {
      role: "admin",
      division_id: division.id,
      scope: "division",
      onboarding_completed: false,
    },
    user_metadata: {
      first_name: "Blessing",
      last_name: "Awom",
      admin_code: "3000",
    },
  });
  console.log("  ", adminResult.id, `admin@${SYNTH_DOMAIN}`,
    adminResult.preservedOnboarding ? "(onboarding kept)" : "");

  console.log(`→ AMs (${AMS.length})`);
  for (const am of AMS) {
    const pc = pcByCode[am.pc_code];
    if (!pc) {
      console.error(`  ✗ ${am.code} ${am.first_name}: unknown pc_code ${am.pc_code}`);
      continue;
    }
    const email = `${am.code}@${SYNTH_DOMAIN}`;
    const full_name = [am.first_name, am.last_name].filter(Boolean).join(" ");
    const result = await upsertAuthUser({
      email,
      password: passwordFromPin(PIN),
      app_metadata: {
        role: "am",
        am_code: am.code,
        pc_id: pc.id,
        onboarding_completed: false,
      },
      user_metadata: {
        first_name: am.first_name,
        last_name: am.last_name ?? "",
        team_label: am.team_label ?? pc.name,
      },
    });
    const userId = result.id;

    const { data: amRow, error: amErr } = await sb
      .from("account_managers")
      .upsert(
        {
          pc_id: pc.id,
          auth_user_id: userId,
          full_name: full_name || am.first_name,
          first_name: am.first_name,
          last_name: am.last_name || null,
          team_label: am.team_label ?? null,
          am_code: am.code,
          initials: initialsFor(am.first_name, am.last_name),
          color: am.color ?? colorFor(am.code),
          daily_goal: am.daily_goal ?? 15,
          // Don't clobber an AM who's already finished onboarding.
          ...(result.preservedOnboarding ? { onboarding_completed: true } : { onboarding_completed: false }),
        },
        { onConflict: "am_code" },
      )
      .select()
      .single();
    if (amErr) throw amErr;

    await sb.auth.admin.updateUserById(userId, {
      app_metadata: {
        role: "am",
        am_code: am.code,
        pc_id: pc.id,
        am_id: amRow.id,
        onboarding_completed: result.preservedOnboarding ? true : false,
      },
    });

    console.log("  ", am.code, full_name,
      am.team_label ? `(${am.team_label})` : "",
      result.preservedOnboarding ? "· onboarding kept" : "");
  }

  console.log("");
  console.log("Done.");
  console.log("  Admin: code 3000, password", ADMIN_PWD, "→ blocked on onboarding");
  console.log("  AMs:   PIN 1234           → blocked on onboarding");
}

main().catch((e) => { console.error("Seed failed:", e); process.exit(1); });
