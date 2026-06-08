-- LogIt — daily retention report (per PC, not per AM)
--
-- One row per PC per day. Any AM in the PC can fill it; last write wins and
-- replaces filled_by_am_id so the team can see who entered the figures.
-- Admin (division scope) can read and overwrite any in the division.
-- Values stored in ₦ millions (numeric, 2 dp) to match the source template.

set search_path = public, extensions;

create table retention_reports (
  id                  uuid primary key default uuid_generate_v4(),
  pc_id               uuid not null references pcs(id) on delete cascade,
  report_date         date not null,
  pledges_naira_m     numeric(14, 2) not null default 0 check (pledges_naira_m   >= 0),
  inflow_naira_m      numeric(14, 2) not null default 0 check (inflow_naira_m    >= 0),
  outflow_naira_m     numeric(14, 2) not null default 0 check (outflow_naira_m   >= 0),
  retention_naira_m   numeric(14, 2) not null default 0 check (retention_naira_m >= 0),
  filled_by_am_id     uuid not null references account_managers(id) on delete restrict,
  submitted_at        timestamptz not null default now(),
  edited_at           timestamptz,
  unique (pc_id, report_date)
);

create index retention_reports_pc_date_idx on retention_reports(pc_id, report_date desc);

alter table retention_reports enable row level security;

-- READ: any AM can read their own PC's rows (so they can see what's filled).
create policy "retention:read own pc" on retention_reports for select using (
  pc_id = auth_pc_id()
);

-- READ admin: division admin reads any in their division.
create policy "retention:admin read division" on retention_reports for select using (
  auth_role() = 'admin' and exists (
    select 1 from pcs p
    where p.id = retention_reports.pc_id and p.division_id = auth_division_id()
  )
);

-- INSERT AM: any AM in the PC can insert today's row.
create policy "retention:am insert own pc today" on retention_reports
  for insert with check (
    auth_role() = 'am'
    and pc_id = auth_pc_id()
    and report_date = current_date
    and filled_by_am_id = auth_am_id()
  );

-- UPDATE AM: any AM in the PC can overwrite today's row (last-write-wins).
create policy "retention:am update own pc today" on retention_reports
  for update using (
    auth_role() = 'am'
    and pc_id = auth_pc_id()
    and report_date = current_date
  )
  with check (
    auth_role() = 'am'
    and pc_id = auth_pc_id()
    and report_date = current_date
    and filled_by_am_id = auth_am_id()
  );

-- ADMIN full write: division admin can correct any retention row in their division.
create policy "retention:admin write division" on retention_reports
  for all using (
    auth_role() = 'admin' and exists (
      select 1 from pcs p
      where p.id = retention_reports.pc_id and p.division_id = auth_division_id()
    )
  )
  with check (
    auth_role() = 'admin' and exists (
      select 1 from pcs p
      where p.id = retention_reports.pc_id and p.division_id = auth_division_id()
    )
  );
