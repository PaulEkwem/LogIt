# LogIt

Daily account-opening report app for GTBank Account Managers.

**Log it. Track it. Send it.**

## What it is

LogIt replaces the spreadsheet/manual tally that AMs in Personal Banking use to report their daily account openings. Once-a-day end-of-day report, conversational entry, gamified to drive reporting discipline.

## Stack

Single-file mockup. `index.html` — vanilla HTML / CSS / JS, Lucide icons via CDN, Nunito via Google Fonts. No build step. Open in a browser.

## Demo login

| Code | Identity |
|------|----------|
| `4821` | Adaeze Okonkwo |
| `4822` | Chukwuemeka Obi |
| `4823` | Fatima Aliyu |
| `4824` | Babatunde Adeyemi |
| `4825` | Ngozi Eze |
| `4826` | Seun Badmus |
| `3000` + password `admin2026` | Admin Console |

All AMs are on team **SME MBA** (PC 482), division **SME Lagos Mainland**.

## Data model (per AM, per day)

1. **Acquired** — new prospects/accounts onboarded today
2. **Opened from today's acquired** — same-day conversions (drives the ≥50% accolade)
3. **Total opened** — includes today's conversions plus accounts opened from earlier pipeline
4. **Per-type breakdown** of total opened — Tier 1 / GTCREATE / Tier 3 / SME / SKS

Funded is *not* tracked here — admin handles that separately.

## Gamification

- +5 XP per Acquired
- +10 XP per Opened
- +30 XP bonus for ≥50% same-day conversion
- +50 XP bonus for hitting daily goal
- Streak +1 on submission (rewards reporting discipline, not performance)
- Daily goal is set per-AM by the PC supervisor

## Status

Visual mockup. No backend, no persistence — all state is in-memory. Refresh resets everything.
