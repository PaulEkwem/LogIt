-- LogIt — allow report_windows.closed_reason = 'expired'
--
-- A daily Vercel cron at 23:59 Lagos closes any still-open windows. Those
-- closures are tagged 'expired' (distinct from 'auto' = everyone filed,
-- and 'manual' = Blessing closed early) so the audit trail tells the
-- whole story.

set search_path = public, extensions;

alter table report_windows drop constraint if exists report_windows_closed_reason_check;
alter table report_windows add constraint report_windows_closed_reason_check
  check (closed_reason in ('auto', 'manual', 'expired'));
