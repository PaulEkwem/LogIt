-- LogIt — let xp_ledger reference either a daily_report or an event_report.
-- The original schema constrained xp_ledger.report_id to daily_reports(id) only,
-- which rejected event report submissions. This migration:
--   1. renames report_id → daily_report_id for clarity
--   2. adds event_report_id column (FK → event_reports)
--   3. expands the reason CHECK to include event_acquired / event_participation
--   4. enforces "at most one source per XP row"

set search_path = public, extensions;

alter table xp_ledger rename column report_id to daily_report_id;

alter table xp_ledger
  add column event_report_id uuid references event_reports(id) on delete cascade;

alter table xp_ledger drop constraint xp_ledger_reason_check;
alter table xp_ledger add constraint xp_ledger_reason_check
  check (reason in (
    'acquired',
    'opened',
    'conversion_bonus',
    'goal_hit',
    'event_acquired',
    'event_participation'
  ));

-- At most one of daily_report_id / event_report_id can be set on a row.
alter table xp_ledger add constraint xp_ledger_one_source
  check (daily_report_id is null or event_report_id is null);
