create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  creditor text not null check (char_length(trim(creditor)) > 0),
  description text not null default '',
  amount numeric not null check (amount >= 0),
  due_date date,
  status text not null default 'open' check (status in ('open','paid')),
  paid_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists debts_workspace_id_idx on public.debts(workspace_id);
create index if not exists debts_workspace_due_date_idx on public.debts(workspace_id, due_date);

alter table public.debts enable row level security;

drop policy if exists debts_select_workspace on public.debts;
create policy debts_select_workspace
on public.debts for select
to authenticated
using (is_4bit_workspace_member(workspace_id));

drop policy if exists debts_insert_workspace on public.debts;
create policy debts_insert_workspace
on public.debts for insert
to authenticated
with check (is_4bit_workspace_member(workspace_id));

drop policy if exists debts_update_workspace on public.debts;
create policy debts_update_workspace
on public.debts for update
to authenticated
using (is_4bit_workspace_member(workspace_id))
with check (is_4bit_workspace_member(workspace_id));

drop policy if exists debts_delete_workspace on public.debts;
create policy debts_delete_workspace
on public.debts for delete
to authenticated
using (is_4bit_workspace_member(workspace_id));

grant select, insert, update, delete on table public.debts to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'debts'
  ) then
    alter publication supabase_realtime add table public.debts;
  end if;
end $$;
