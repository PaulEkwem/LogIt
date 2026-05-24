-- LogIt — POS prospects on both daily and storm reports
--
-- POS prospect = a merchant interested in a GTBank POS terminal.
-- Separate from account-acquisition; captured by name + business type so the
-- POS team can follow up after the report.
--
-- Stored as a JSONB array per report row:
--   [{"name": "John's Mart", "business_type": "Restaurant"}, ...]
-- Empty array = no POS prospects.

set search_path = public, extensions;

alter table daily_reports add column pos_prospects jsonb not null default '[]'::jsonb;
alter table event_reports add column pos_prospects jsonb not null default '[]'::jsonb;

-- Lightweight shape check: must be a JSON array.
alter table daily_reports add constraint daily_reports_pos_prospects_is_array
  check (jsonb_typeof(pos_prospects) = 'array');
alter table event_reports add constraint event_reports_pos_prospects_is_array
  check (jsonb_typeof(pos_prospects) = 'array');
