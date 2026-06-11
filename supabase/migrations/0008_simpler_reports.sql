-- LogIt — simpler daily report + signed retention
--
-- 1. Acquisition daily report is being trimmed to just acquired + opened_same_day.
--    Per-type breakdown and total_opened-from-pipeline are no longer collected,
--    so the constraint that types must sum to total_opened no longer holds.
-- 2. Retention is now the NET of inflow - outflow, calculated server-side.
--    It can be negative (net outflow day) so the >= 0 check must go.

set search_path = public, extensions;

-- ============================================================================
-- DAILY REPORTS
-- ============================================================================

alter table daily_reports drop constraint if exists daily_reports_breakdown_matches;

-- ============================================================================
-- RETENTION REPORTS
-- ============================================================================

alter table retention_reports drop constraint if exists retention_reports_retention_naira_m_check;
