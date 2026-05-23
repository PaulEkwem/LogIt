-- LogIt — cluster marketing campaigns (events)
-- Division-scoped. Admin creates; AMs across all participating PCs log against it.
-- AM sees own + own PC's contribution + division-wide aggregate (no cross-PC AM detail).
-- Realtime enabled so banners appear live on AM dashboards.

set search_path = public, extensions;

-- ============================================================================
-- TABLES
-- ============================================================================

create table events (
  id            uuid primary key default uuid_generate_v4(),
  division_id   uuid not null references divisions(id) on delete cascade,
  name          text not null,
  location      text not null,
  start_date    date not null,
  end_date      date not null check (end_date >= start_date),
  status        text not null default 'active' check (status in ('upcoming', 'active', 'closed')),
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  closed_at     timestamptz
);

create index events_division_status_idx on events(division_id, status);
create index events_dates_idx on events(start_date, end_date);

-- Optional PC scoping. No rows for an event = all PCs in the division participate.
create table event_pcs (
  event_id uuid not null references events(id) on delete cascade,
  pc_id    uuid not null references pcs(id) on delete cascade,
  primary key (event_id, pc_id)
);

create table event_reports (
  id            uuid primary key default uuid_generate_v4(),
  event_id      uuid not null references events(id) on delete cascade,
  am_id         uuid not null references account_managers(id) on delete cascade,
  acquired      int  not null default 0 check (acquired >= 0),
  type_t1       int  not null default 0 check (type_t1 >= 0),
  type_t3       int  not null default 0 check (type_t3 >= 0),
  type_gt       int  not null default 0 check (type_gt >= 0),
  type_sm       int  not null default 0 check (type_sm >= 0),
  type_sk       int  not null default 0 check (type_sk >= 0),
  submitted_at  timestamptz not null default now(),
  edited_at     timestamptz,
  constraint event_reports_breakdown_matches
    check (type_t1 + type_t3 + type_gt + type_sm + type_sk = acquired),
  unique (event_id, am_id)
);

create index event_reports_event_idx on event_reports(event_id);
create index event_reports_am_idx on event_reports(am_id);

-- ============================================================================
-- HELPERS
-- ============================================================================

-- Derive caller's division from their PC.
create or replace function auth_division_id() returns uuid
  language sql stable security definer set search_path = public, extensions
  as $$ select division_id from pcs where id = auth_pc_id() limit 1 $$;

-- Aggregate across the division for an event — used by AMs to see the running total
-- without leaking per-AM or per-PC detail.
create or replace function event_division_aggregate(target_event_id uuid)
  returns table (
    total_acquired      int,
    total_participants  int,
    type_t1             int,
    type_t3             int,
    type_gt             int,
    type_sm             int,
    type_sk             int
  )
  language sql stable security definer set search_path = public, extensions
  as $$
    select
      coalesce(sum(er.acquired), 0)::int       as total_acquired,
      count(distinct er.am_id)::int            as total_participants,
      coalesce(sum(er.type_t1), 0)::int        as type_t1,
      coalesce(sum(er.type_t3), 0)::int        as type_t3,
      coalesce(sum(er.type_gt), 0)::int        as type_gt,
      coalesce(sum(er.type_sm), 0)::int        as type_sm,
      coalesce(sum(er.type_sk), 0)::int        as type_sk
    from event_reports er
    join events e on e.id = er.event_id
    where er.event_id = target_event_id
      and e.division_id = auth_division_id();
  $$;

-- Caller's own PC's contribution to an event (for the AM's Team-level slice).
create or replace function event_pc_aggregate(target_event_id uuid)
  returns table (
    total_acquired      int,
    total_participants  int
  )
  language sql stable security definer set search_path = public, extensions
  as $$
    select
      coalesce(sum(er.acquired), 0)::int   as total_acquired,
      count(distinct er.am_id)::int        as total_participants
    from event_reports er
    join account_managers am on am.id = er.am_id
    where er.event_id = target_event_id
      and am.pc_id = auth_pc_id();
  $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table events        enable row level security;
alter table event_pcs     enable row level security;
alter table event_reports enable row level security;

-- EVENTS — anyone signed in within the division can SELECT (banners need this).
create policy "events:read in division" on events
  for select using (division_id = auth_division_id());

create policy "events:admin manage" on events
  for all using (auth_role() = 'admin' and division_id = auth_division_id())
  with check (auth_role() = 'admin' and division_id = auth_division_id());

-- EVENT_PCS — same scope.
create policy "event_pcs:read in division" on event_pcs for select using (
  exists (select 1 from events e where e.id = event_pcs.event_id and e.division_id = auth_division_id())
);

create policy "event_pcs:admin manage" on event_pcs
  for all using (
    auth_role() = 'admin' and
    exists (select 1 from events e where e.id = event_pcs.event_id and e.division_id = auth_division_id())
  )
  with check (
    auth_role() = 'admin' and
    exists (select 1 from events e where e.id = event_pcs.event_id and e.division_id = auth_division_id())
  );

-- EVENT_REPORTS
--   - AM reads own
--   - AM reads other reports in their own PC (own-PC visibility)
--   - Admin reads all in division
--   Critically: no policy lets an AM see cross-PC reports. Division aggregate goes
--   through the security-definer RPC, which returns only totals, not rows.
create policy "event_reports:am read own" on event_reports for select using (am_id = auth_am_id());

create policy "event_reports:am read own pc" on event_reports for select using (
  exists (
    select 1 from account_managers am
    where am.id = event_reports.am_id and am.pc_id = auth_pc_id()
  )
);

create policy "event_reports:admin read division" on event_reports for select using (
  auth_role() = 'admin' and
  exists (
    select 1 from events e
    where e.id = event_reports.event_id and e.division_id = auth_division_id()
  )
);

-- AM can insert/update only their own row.
create policy "event_reports:am insert own" on event_reports
  for insert with check (am_id = auth_am_id());

create policy "event_reports:am update own" on event_reports
  for update using (am_id = auth_am_id())
  with check (am_id = auth_am_id());

-- Admin can do everything within their division.
create policy "event_reports:admin write division" on event_reports
  for all using (
    auth_role() = 'admin' and
    exists (
      select 1 from events e
      where e.id = event_reports.event_id and e.division_id = auth_division_id()
    )
  )
  with check (
    auth_role() = 'admin' and
    exists (
      select 1 from events e
      where e.id = event_reports.event_id and e.division_id = auth_division_id()
    )
  );

-- ============================================================================
-- REALTIME
-- ============================================================================

-- Push events table changes to subscribed clients so AM banners update live.
alter publication supabase_realtime add table events;
