-- LogIt — admin-gated report windows + retention slots
--
-- Reports are no longer always-open. Blessing opens a window each time the
-- daily routine kicks off. AMs see a waiting state until she does, and the
-- window auto-closes when every team / AM has filed.
--
-- Acquisition has one slot per day. Retention has two: 'midday' (12pm) and
-- 'eod' (5pm) — same fields captured at two different times.

set search_path = public, extensions;

-- ============================================================================
-- REPORT WINDOWS
-- ============================================================================

create table report_windows (
  id              uuid primary key default uuid_generate_v4(),
  division_id     uuid not null references divisions(id) on delete cascade,
  report_type     text not null check (report_type in ('acquisition', 'retention')),
  report_date     date not null,
  slot            text not null check (slot in ('single', 'midday', 'eod')),
  opened_at       timestamptz not null default now(),
  opened_by       uuid not null references auth.users(id),
  closed_at       timestamptz,
  closed_by       uuid references auth.users(id),
  closed_reason   text check (closed_reason in ('auto', 'manual')),
  created_at      timestamptz not null default now(),
  unique (division_id, report_type, report_date, slot)
);

create index report_windows_div_date_idx on report_windows(division_id, report_date desc);

alter table report_windows enable row level security;

-- Anyone in the division reads windows (AM home + admin console).
create policy "windows:read in division" on report_windows for select using (
  division_id = auth_division_id()
);

-- Only division admin can write.
create policy "windows:admin write division" on report_windows
  for all using (
    auth_role() = 'admin' and division_id = auth_division_id()
  )
  with check (
    auth_role() = 'admin' and division_id = auth_division_id()
  );

-- ============================================================================
-- RETENTION SLOT
-- ============================================================================

alter table retention_reports add column slot text not null default 'midday'
  check (slot in ('midday', 'eod'));

-- Drop the old (pc_id, report_date) unique constraint and add (pc_id, report_date, slot)
alter table retention_reports drop constraint retention_reports_pc_id_report_date_key;
alter table retention_reports add constraint retention_reports_pc_id_report_date_slot_key
  unique (pc_id, report_date, slot);

-- Tighten the AM insert policy so the slot matches an open window. The policy
-- already restricts to current_date and own PC; this adds the window check.
drop policy if exists "retention:am insert own pc today" on retention_reports;
create policy "retention:am insert own pc today" on retention_reports
  for insert with check (
    auth_role() = 'am'
    and pc_id = auth_pc_id()
    and report_date = current_date
    and filled_by_am_id = auth_am_id()
    and exists (
      select 1 from report_windows w
      where w.division_id = auth_division_id()
        and w.report_type = 'retention'
        and w.report_date = current_date
        and w.slot = retention_reports.slot
        and w.closed_at is null
    )
  );

-- Update path: any AM in the PC can overwrite while the window for that slot is open.
drop policy if exists "retention:am update own pc today" on retention_reports;
create policy "retention:am update own pc today" on retention_reports
  for update using (
    auth_role() = 'am'
    and pc_id = auth_pc_id()
    and report_date = current_date
    and exists (
      select 1 from report_windows w
      where w.division_id = auth_division_id()
        and w.report_type = 'retention'
        and w.report_date = current_date
        and w.slot = retention_reports.slot
        and w.closed_at is null
    )
  )
  with check (
    auth_role() = 'am'
    and pc_id = auth_pc_id()
    and report_date = current_date
    and filled_by_am_id = auth_am_id()
  );

-- ============================================================================
-- ACQUISITION WINDOW ENFORCEMENT
-- ============================================================================

-- AM insert path checks the acquisition window for today.
drop policy if exists "reports:am insert own today" on daily_reports;
create policy "reports:am insert own today" on daily_reports
  for insert with check (
    am_id = auth_am_id()
    and report_date = current_date
    and exists (
      select 1 from report_windows w
      where w.division_id = auth_division_id()
        and w.report_type = 'acquisition'
        and w.report_date = current_date
        and w.slot = 'single'
        and w.closed_at is null
    )
  );

drop policy if exists "reports:am update own today" on daily_reports;
create policy "reports:am update own today" on daily_reports
  for update using (
    am_id = auth_am_id()
    and report_date = current_date
    and exists (
      select 1 from report_windows w
      where w.division_id = auth_division_id()
        and w.report_type = 'acquisition'
        and w.report_date = current_date
        and w.slot = 'single'
        and w.closed_at is null
    )
  )
  with check (
    am_id = auth_am_id()
    and report_date = current_date
  );
