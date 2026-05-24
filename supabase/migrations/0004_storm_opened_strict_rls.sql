-- LogIt — storm event reports: add opened tracking + tighten RLS
--
-- 1. event_reports gains a total_opened column. Per-type breakdown now sums
--    to total_opened (mirrors daily_reports semantics — per-type always = opened mix).
-- 2. AM can no longer read other AMs' event_reports, even in their own PC.
--    Strict isolation: AM sees only their own; admin sees everything in division.
-- 3. The aggregate RPCs (event_division_aggregate, event_pc_aggregate) become
--    dead code with the strict-isolation rule, so we drop them.

set search_path = public, extensions;

-- 1. Add total_opened
alter table event_reports add column total_opened int not null default 0
  check (total_opened >= 0);

-- Backfill: assume everything previously logged was opened (existing demo data).
update event_reports set total_opened = acquired where total_opened = 0 and acquired > 0;

-- Cross-column: opened can't exceed acquired
alter table event_reports add constraint event_reports_opened_le_acquired
  check (total_opened <= acquired);

-- Per-type breakdown now sums to total_opened (was: acquired).
alter table event_reports drop constraint event_reports_breakdown_matches;
alter table event_reports add constraint event_reports_breakdown_matches
  check (type_t1 + type_t3 + type_gt + type_sm + type_sk = total_opened);

-- 2. Tighten RLS: drop the policy that let AMs see other AMs' event reports.
drop policy if exists "event_reports:am read own pc" on event_reports;

-- 3. Drop the aggregate RPCs (only AMs used them; with strict isolation they
--    have no caller in the app).
drop function if exists event_division_aggregate(uuid);
drop function if exists event_pc_aggregate(uuid);
