-- LogIt — initial schema
-- Multi-tenant: division -> pc -> account_managers. Daily reports keyed by AM + date.
-- Auth model: each AM and each PC admin is a Supabase auth user with app_metadata.am_id/pc_id/role.
-- RLS isolates AMs to their own data and their PC's leaderboard; admins manage their own PC only.

set search_path = public, extensions;

create extension if not exists "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

create table divisions (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table pcs (
  id           uuid primary key default uuid_generate_v4(),
  division_id  uuid not null references divisions(id) on delete restrict,
  name         text not null,                       -- "SME MBA"
  pc_code      text not null unique,                -- "482"
  created_at   timestamptz not null default now()
);

create table account_managers (
  id             uuid primary key default uuid_generate_v4(),
  pc_id          uuid not null references pcs(id) on delete restrict,
  auth_user_id   uuid unique references auth.users(id) on delete cascade,
  full_name      text not null,
  am_code        text not null unique,              -- "4821"
  initials       text not null,                     -- "AO"
  color          text not null,                     -- "#CE1126"
  daily_goal     int  not null default 15 check (daily_goal > 0),
  created_at     timestamptz not null default now(),
  archived_at    timestamptz
);

create index account_managers_pc_idx on account_managers(pc_id) where archived_at is null;

create table daily_reports (
  id                uuid primary key default uuid_generate_v4(),
  am_id             uuid not null references account_managers(id) on delete cascade,
  report_date       date not null,
  acquired          int  not null default 0 check (acquired >= 0),
  opened_same_day   int  not null default 0 check (opened_same_day >= 0 and opened_same_day <= acquired),
  total_opened      int  not null default 0 check (total_opened >= 0),
  type_t1           int  not null default 0 check (type_t1 >= 0),
  type_t3           int  not null default 0 check (type_t3 >= 0),
  type_gt           int  not null default 0 check (type_gt >= 0),
  type_sm           int  not null default 0 check (type_sm >= 0),
  type_sk           int  not null default 0 check (type_sk >= 0),
  submitted_at      timestamptz not null default now(),
  edited_at         timestamptz,
  constraint daily_reports_breakdown_matches
    check (type_t1 + type_t3 + type_gt + type_sm + type_sk = total_opened),
  unique (am_id, report_date)
);

create index daily_reports_am_date_idx on daily_reports(am_id, report_date desc);

create table xp_ledger (
  id          uuid primary key default uuid_generate_v4(),
  am_id       uuid not null references account_managers(id) on delete cascade,
  amount      int  not null,
  reason      text not null check (reason in ('acquired','opened','conversion_bonus','goal_hit')),
  report_id   uuid references daily_reports(id) on delete cascade,
  awarded_at  timestamptz not null default now()
);

create index xp_ledger_am_idx on xp_ledger(am_id, awarded_at desc);

-- ============================================================================
-- HELPERS — pull caller's am_id / pc_id / role from JWT app_metadata
-- ============================================================================

create or replace function auth_am_id() returns uuid
  language sql stable security definer set search_path = public, extensions
  as $$ select nullif(((auth.jwt() -> 'app_metadata') ->> 'am_id'), '')::uuid $$;

create or replace function auth_pc_id() returns uuid
  language sql stable security definer set search_path = public, extensions
  as $$ select nullif(((auth.jwt() -> 'app_metadata') ->> 'pc_id'), '')::uuid $$;

create or replace function auth_role() returns text
  language sql stable security definer set search_path = public, extensions
  as $$ select coalesce((auth.jwt() -> 'app_metadata') ->> 'role', '') $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table divisions         enable row level security;
alter table pcs               enable row level security;
alter table account_managers  enable row level security;
alter table daily_reports     enable row level security;
alter table xp_ledger         enable row level security;

-- DIVISIONS: anyone signed in can read their own division (via pc); admins same.
create policy "divisions:read own" on divisions for select using (
  exists (
    select 1 from pcs p where p.division_id = divisions.id and p.id = auth_pc_id()
  )
);

-- PCS: read own PC only.
create policy "pcs:read own" on pcs for select using (id = auth_pc_id());

-- ACCOUNT MANAGERS: read all AMs in own PC (for leaderboard); admin writes within own PC.
create policy "ams:read own pc" on account_managers for select using (pc_id = auth_pc_id());

create policy "ams:admin manage own pc" on account_managers
  for all using (pc_id = auth_pc_id() and auth_role() = 'admin')
  with check (pc_id = auth_pc_id() and auth_role() = 'admin');

-- DAILY REPORTS: AM reads all reports in own PC (for leaderboard).
create policy "reports:read own pc" on daily_reports for select using (
  exists (select 1 from account_managers am where am.id = daily_reports.am_id and am.pc_id = auth_pc_id())
);

-- AM writes only own reports, today only.
create policy "reports:am insert own today" on daily_reports
  for insert with check (am_id = auth_am_id() and report_date = current_date);

create policy "reports:am update own today" on daily_reports
  for update using (am_id = auth_am_id() and report_date = current_date)
  with check (am_id = auth_am_id() and report_date = current_date);

-- Admin can write any report within own PC (for corrections/back-dating).
create policy "reports:admin all in pc" on daily_reports
  for all using (
    auth_role() = 'admin' and
    exists (select 1 from account_managers am where am.id = daily_reports.am_id and am.pc_id = auth_pc_id())
  )
  with check (
    auth_role() = 'admin' and
    exists (select 1 from account_managers am where am.id = daily_reports.am_id and am.pc_id = auth_pc_id())
  );

-- XP LEDGER: AM reads own XP; admin reads all in PC.
create policy "xp:am read own" on xp_ledger for select using (am_id = auth_am_id());

create policy "xp:admin read pc" on xp_ledger for select using (
  auth_role() = 'admin' and
  exists (select 1 from account_managers am where am.id = xp_ledger.am_id and am.pc_id = auth_pc_id())
);

-- XP rows are created by edge functions using the service role; no INSERT policy for normal clients.

-- ============================================================================
-- VIEWS / RPC
-- ============================================================================

-- Compute current streak for a given AM (consecutive weekdays with a report, working back from today).
create or replace function current_streak(target_am_id uuid) returns int
  language plpgsql stable security definer set search_path = public, extensions
  as $$
declare
  d date := current_date;
  s int := 0;
  has_report bool;
begin
  -- Walk back until we hit a weekday with no report.
  loop
    -- skip weekends (Sat = 6, Sun = 0)
    if extract(dow from d) in (0, 6) then
      d := d - 1;
      continue;
    end if;
    select exists (
      select 1 from daily_reports where am_id = target_am_id and report_date = d
    ) into has_report;
    exit when not has_report;
    s := s + 1;
    d := d - 1;
    -- safety cap to prevent infinite loops
    if s > 365 then exit; end if;
  end loop;
  return s;
end;
$$;
