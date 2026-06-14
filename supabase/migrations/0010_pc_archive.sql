-- LogIt — archive (soft delete) for PCs
--
-- AMs already have archived_at on account_managers. Mirror it on pcs so
-- Blessing can retire a team without breaking foreign keys / cascading
-- away months of filed reports.

set search_path = public, extensions;

alter table pcs add column archived_at timestamptz;
create index pcs_division_active_idx on pcs(division_id) where archived_at is null;
