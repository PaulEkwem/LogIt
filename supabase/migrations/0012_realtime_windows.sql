-- LogIt — enable Realtime on report_windows
--
-- Adds the table to the supabase_realtime publication so Postgres emits
-- change events when rows are inserted / updated / deleted. The AM home
-- subscribes via <RealtimeWindowRefresh /> and refreshes the page
-- automatically when admin opens or closes a window.
--
-- Idempotent — re-running has no effect if the table is already published.

do $$
declare
  is_published boolean;
begin
  select exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'report_windows'
  ) into is_published;
  if not is_published then
    alter publication supabase_realtime add table report_windows;
  end if;
end;
$$;
