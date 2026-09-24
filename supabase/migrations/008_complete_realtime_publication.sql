do $$
declare
  t text;
begin
  foreach t in array array[
    'ledger_entries',
    'compensations',
    'deadlines',
    'maintenance_periods',
    'access_credentials'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
