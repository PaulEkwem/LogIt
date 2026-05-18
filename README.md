# LogIt

Daily account-opening report app for GTBank Account Managers.

**Log it. Track it. Send it.**

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript** + **Tailwind CSS v4**
- **Supabase** — Postgres, Auth, Row-Level Security, real-time
- **Lucide** icons, **Nunito** type
- Deployed on **Vercel** (auto-deploy on push to `main`)

## Architecture

### Auth — bridged Supabase Auth

AM codes (4 digits) are encoded as synthetic emails (`<code>@logit.invalid`) paired with a PIN as password. Admin uses `admin@logit.invalid` + the admin password. Supabase Auth handles sessions, refresh, and RLS gating via JWT claims:

```jsonc
// AM session
{ "role": "am",    "am_code": "4821", "am_id": "<uuid>", "pc_id": "<uuid>" }

// Admin session
{ "role": "admin", "pc_id": "<uuid>" }
```

RLS policies in [`supabase/migrations/0001_initial.sql`](supabase/migrations/0001_initial.sql) read `auth.jwt() -> 'app_metadata'` to scope all queries. AMs see only their PC; admins manage only their PC; cross-PC isolation is enforced at the database.

### Data model

| Table | Purpose |
|---|---|
| `divisions`        | "SME Lagos Mainland" |
| `pcs`              | "SME MBA" (PC 482), one division can hold many |
| `account_managers` | linked to `auth.users` 1:1 |
| `daily_reports`    | unique per `(am_id, report_date)` |
| `xp_ledger`        | append-only audit of XP awards |

Streaks are computed on the fly via the `current_streak()` RPC.

### Routes

| Path | Purpose |
|---|---|
| `/`            | Code + PIN login (admin path via code `3000`) |
| `/home`        | AM dashboard (today's progress + Log CTA) |
| `/team`        | Leaderboard for the AM's PC |
| `/report`      | Personal analytics — Today / Week / Month / Custom × Acquired / Opened |
| `/log`         | Tally entry flow (4 steps + celebration) |
| `/admin`       | Admin Console — submission progress, AM list, send report |
| `/api/auth/*`  | login / admin / signout |
| `/api/reports/submit` | upsert today's report + award XP |

## Setup (one-time)

1. Create a Supabase project: https://supabase.com/dashboard → New project → name `logit`.
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` — service role secret (server-only)
3. Run the migration: open Supabase → SQL Editor → paste contents of `supabase/migrations/0001_initial.sql` → run.
4. Seed demo data: `npm run seed`
5. Add the three env vars to Vercel: Project → Settings → Environment Variables (all three, Production + Preview).

## Demo credentials (post-seed)

| Identity | Code | Secret |
|---|---|---|
| Adaeze Okonkwo    | `4821` | PIN `1234` |
| Chukwuemeka Obi   | `4822` | PIN `1234` |
| Fatima Aliyu      | `4823` | PIN `1234` |
| Babatunde Adeyemi | `4824` | PIN `1234` |
| Ngozi Eze         | `4825` | PIN `1234` |
| Seun Badmus       | `4826` | PIN `1234` |
| **Admin**         | `3000` | password `admin2026` |

All AMs are on team **SME MBA** (PC 482), division **SME Lagos Mainland**.

## Develop

```bash
npm install
npm run dev          # localhost:3000
npm run build        # production build
npm run seed         # seed demo data into Supabase
```

## Gamification rules

- **+5 XP** per Acquired
- **+10 XP** per Opened
- **+30 XP** bonus for ≥50% same-day conversion
- **+50 XP** bonus for hitting daily goal
- **Streak +1** on submission (rewards reporting discipline, not performance)

## Legacy

The original single-file vanilla mockup is preserved under [`legacy/`](legacy/) for visual reference.
