-- LogIt — real-user rollout + onboarding gating
--
-- 1. Profile fields on account_managers: first_name, last_name, team_label,
--    onboarding_completed. Split out from the synthetic full_name so AMs can
--    confirm/edit on first login.
-- 2. Division-admin support: existing 'admin' role expands to mean "manages
--    everything in their division" (was previously per-PC). Achieved by
--    teaching the auth helpers to read division_id from app_metadata when
--    pc_id isn't set, and updating policies accordingly.
-- 3. team_label is for AMs temporarily borrowing another team's PC code
--    (e.g., Paul under Ipaja using MBA's PC 312 until Ipaja has its own).

set search_path = public, extensions;

-- ============================================================================
-- PROFILE FIELDS
-- ============================================================================

alter table account_managers add column first_name text;
alter table account_managers add column last_name text;
alter table account_managers add column team_label text;
alter table account_managers add column onboarding_completed boolean not null default false;

-- Backfill first_name / last_name from existing full_name (demo users)
update account_managers
  set first_name = split_part(full_name, ' ', 1)
  where first_name is null;

update account_managers
  set last_name = nullif(trim(substring(full_name from position(' ' in full_name) + 1)), '')
  where last_name is null and full_name like '% %';

-- Existing demo AMs were onboarded long ago; mark them complete so they aren't
-- forced through onboarding.
update account_managers set onboarding_completed = true;

-- first_name now required
alter table account_managers alter column first_name set not null;

-- full_name stays for backwards-compat in queries; updated alongside first/last
-- by the app on profile completion.

-- ============================================================================
-- DIVISION-ADMIN: expand auth helpers and policies
-- ============================================================================

-- auth_division_id() now reads explicit division_id from JWT first (division
-- admin's claim) and falls back to looking it up via pc_id (per-PC admin).
create or replace function auth_division_id() returns uuid
  language sql stable security definer set search_path = public, extensions
  as $$
    select coalesce(
      nullif(((auth.jwt() -> 'app_metadata') ->> 'division_id'), '')::uuid,
      (select division_id from pcs where id = auth_pc_id() limit 1)
    )
  $$;

-- account_managers admin policy — allow per-PC admins (legacy) AND division admins
drop policy if exists "ams:admin manage own pc" on account_managers;
create policy "ams:admin manage" on account_managers
  for all using (
    auth_role() = 'admin' and (
      pc_id = auth_pc_id()
      OR exists (
        select 1 from pcs p
        where p.id = account_managers.pc_id and p.division_id = auth_division_id()
      )
    )
  )
  with check (
    auth_role() = 'admin' and (
      pc_id = auth_pc_id()
      OR exists (
        select 1 from pcs p
        where p.id = account_managers.pc_id and p.division_id = auth_division_id()
      )
    )
  );

-- daily_reports admin policy — same expansion
drop policy if exists "reports:admin all in pc" on daily_reports;
create policy "reports:admin write any in division" on daily_reports
  for all using (
    auth_role() = 'admin' and
    exists (
      select 1 from account_managers am join pcs p on p.id = am.pc_id
      where am.id = daily_reports.am_id and (
        am.pc_id = auth_pc_id() OR p.division_id = auth_division_id()
      )
    )
  )
  with check (
    auth_role() = 'admin' and
    exists (
      select 1 from account_managers am join pcs p on p.id = am.pc_id
      where am.id = daily_reports.am_id and (
        am.pc_id = auth_pc_id() OR p.division_id = auth_division_id()
      )
    )
  );

-- PCs read policy needs to allow division admin to see all PCs in their division
drop policy if exists "pcs:read own" on pcs;
create policy "pcs:read in scope" on pcs for select using (
  id = auth_pc_id()
  OR (auth_role() = 'admin' AND division_id = auth_division_id())
);

-- divisions read — division admin can see their own division
drop policy if exists "divisions:read own" on divisions;
create policy "divisions:read own" on divisions for select using (
  exists (select 1 from pcs p where p.division_id = divisions.id and p.id = auth_pc_id())
  OR (auth_role() = 'admin' AND id = auth_division_id())
);

-- Events admin policies — already use auth_division_id(), so updating that
-- function above is enough. No changes needed here.
-- Same for event_reports admin.
