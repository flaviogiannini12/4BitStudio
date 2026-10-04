-- Piano Editoriale: calendar, workflow, original-quality assets and archive
create table if not exists public.editorial_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  account text not null check (account in ('casaro','autoscuola_susa')),
  platform text not null check (platform in ('fb_ig','tiktok','youtube','whatsapp')),
  content_type text not null default 'post',
  title text not null,
  description text not null default '',
  hook text not null default '',
  script text not null default '',
  caption text not null default '',
  hashtags text not null default '',
  cta text not null default '',
  objective text not null default '',
  status text not null default 'idea' check (status in ('idea','to_produce','in_progress','review','ready','scheduled','published','archived')),
  assignee_id uuid references public.team_members(id) on delete set null,
  support_member_ids uuid[] not null default '{}',
  publish_date date,
  publish_time time,
  published_at timestamptz,
  archived_at timestamptz,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.editorial_steps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  editorial_item_id uuid not null references public.editorial_items(id) on delete cascade,
  label text not null,
  owner_member_id uuid references public.team_members(id) on delete set null,
  done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.editorial_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  editorial_item_id uuid not null references public.editorial_items(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  asset_role text not null default 'asset',
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists editorial_items_workspace_date_idx on public.editorial_items(workspace_id,publish_date);
create index if not exists editorial_items_workspace_status_idx on public.editorial_items(workspace_id,status);
create index if not exists editorial_items_workspace_account_platform_idx on public.editorial_items(workspace_id,account,platform);
create index if not exists editorial_items_owner_idx on public.editorial_items(owner_id);
create index if not exists editorial_items_assignee_idx on public.editorial_items(assignee_id);
create index if not exists editorial_steps_item_idx on public.editorial_steps(editorial_item_id,sort_order);
create index if not exists editorial_steps_workspace_idx on public.editorial_steps(workspace_id);
create index if not exists editorial_steps_owner_member_idx on public.editorial_steps(owner_member_id);
create index if not exists editorial_assets_item_idx on public.editorial_assets(editorial_item_id,created_at);
create index if not exists editorial_assets_workspace_idx on public.editorial_assets(workspace_id);
create index if not exists editorial_assets_uploaded_by_idx on public.editorial_assets(uploaded_by);

create or replace function public.set_editorial_item_timestamps()
returns trigger language plpgsql set search_path=public as $$
begin
  new.updated_at:=now();
  if new.status='published' then
    new.published_at:=coalesce(new.published_at,now());
    new.archived_at:=coalesce(new.archived_at,now());
  elsif new.status='archived' then
    new.archived_at:=coalesce(new.archived_at,now());
  else
    new.archived_at:=null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_editorial_item_timestamps on public.editorial_items;
create trigger trg_editorial_item_timestamps before insert or update on public.editorial_items
for each row execute function public.set_editorial_item_timestamps();

alter table public.editorial_items enable row level security;
alter table public.editorial_steps enable row level security;
alter table public.editorial_assets enable row level security;

drop policy if exists editorial_items_select_workspace on public.editorial_items;
create policy editorial_items_select_workspace on public.editorial_items for select to authenticated
using (exists(select 1 from public.workspace_members wm where wm.workspace_id=editorial_items.workspace_id and wm.user_id=(select auth.uid())));
drop policy if exists editorial_items_insert_workspace on public.editorial_items;
create policy editorial_items_insert_workspace on public.editorial_items for insert to authenticated
with check (owner_id=(select auth.uid()) and exists(select 1 from public.workspace_members wm where wm.workspace_id=editorial_items.workspace_id and wm.user_id=(select auth.uid())));
drop policy if exists editorial_items_update_workspace on public.editorial_items;
create policy editorial_items_update_workspace on public.editorial_items for update to authenticated
using (exists(select 1 from public.workspace_members wm where wm.workspace_id=editorial_items.workspace_id and wm.user_id=(select auth.uid())))
with check (exists(select 1 from public.workspace_members wm where wm.workspace_id=editorial_items.workspace_id and wm.user_id=(select auth.uid())));
drop policy if exists editorial_items_delete_workspace on public.editorial_items;
create policy editorial_items_delete_workspace on public.editorial_items for delete to authenticated
using (exists(select 1 from public.workspace_members wm where wm.workspace_id=editorial_items.workspace_id and wm.user_id=(select auth.uid())));

drop policy if exists editorial_steps_select_workspace on public.editorial_steps;
create policy editorial_steps_select_workspace on public.editorial_steps for select to authenticated
using (exists(select 1 from public.workspace_members wm where wm.workspace_id=editorial_steps.workspace_id and wm.user_id=(select auth.uid())));
drop policy if exists editorial_steps_insert_workspace on public.editorial_steps;
create policy editorial_steps_insert_workspace on public.editorial_steps for insert to authenticated
with check (exists(select 1 from public.workspace_members wm where wm.workspace_id=editorial_steps.workspace_id and wm.user_id=(select auth.uid())));
drop policy if exists editorial_steps_update_workspace on public.editorial_steps;
create policy editorial_steps_update_workspace on public.editorial_steps for update to authenticated
using (exists(select 1 from public.workspace_members wm where wm.workspace_id=editorial_steps.workspace_id and wm.user_id=(select auth.uid())))
with check (exists(select 1 from public.workspace_members wm where wm.workspace_id=editorial_steps.workspace_id and wm.user_id=(select auth.uid())));
drop policy if exists editorial_steps_delete_workspace on public.editorial_steps;
create policy editorial_steps_delete_workspace on public.editorial_steps for delete to authenticated
using (exists(select 1 from public.workspace_members wm where wm.workspace_id=editorial_steps.workspace_id and wm.user_id=(select auth.uid())));

drop policy if exists editorial_assets_select_workspace on public.editorial_assets;
create policy editorial_assets_select_workspace on public.editorial_assets for select to authenticated
using (exists(select 1 from public.workspace_members wm where wm.workspace_id=editorial_assets.workspace_id and wm.user_id=(select auth.uid())));
drop policy if exists editorial_assets_insert_workspace on public.editorial_assets;
create policy editorial_assets_insert_workspace on public.editorial_assets for insert to authenticated
with check (uploaded_by=(select auth.uid()) and exists(select 1 from public.workspace_members wm where wm.workspace_id=editorial_assets.workspace_id and wm.user_id=(select auth.uid())));
drop policy if exists editorial_assets_update_workspace on public.editorial_assets;
create policy editorial_assets_update_workspace on public.editorial_assets for update to authenticated
using (exists(select 1 from public.workspace_members wm where wm.workspace_id=editorial_assets.workspace_id and wm.user_id=(select auth.uid())))
with check (exists(select 1 from public.workspace_members wm where wm.workspace_id=editorial_assets.workspace_id and wm.user_id=(select auth.uid())));
drop policy if exists editorial_assets_delete_workspace on public.editorial_assets;
create policy editorial_assets_delete_workspace on public.editorial_assets for delete to authenticated
using (exists(select 1 from public.workspace_members wm where wm.workspace_id=editorial_assets.workspace_id and wm.user_id=(select auth.uid())));

grant select,insert,update,delete on public.editorial_items,public.editorial_steps,public.editorial_assets to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('editorial-assets','editorial-assets',false,null,null)
on conflict(id) do update set public=false;

drop policy if exists editorial_storage_select on storage.objects;
create policy editorial_storage_select on storage.objects for select to authenticated
using(bucket_id='editorial-assets' and exists(select 1 from public.workspace_members wm where wm.workspace_id::text=(storage.foldername(name))[1] and wm.user_id=(select auth.uid())));
drop policy if exists editorial_storage_insert on storage.objects;
create policy editorial_storage_insert on storage.objects for insert to authenticated
with check(bucket_id='editorial-assets' and exists(select 1 from public.workspace_members wm where wm.workspace_id::text=(storage.foldername(name))[1] and wm.user_id=(select auth.uid())));
drop policy if exists editorial_storage_update on storage.objects;
create policy editorial_storage_update on storage.objects for update to authenticated
using(bucket_id='editorial-assets' and exists(select 1 from public.workspace_members wm where wm.workspace_id::text=(storage.foldername(name))[1] and wm.user_id=(select auth.uid())))
with check(bucket_id='editorial-assets' and exists(select 1 from public.workspace_members wm where wm.workspace_id::text=(storage.foldername(name))[1] and wm.user_id=(select auth.uid())));
drop policy if exists editorial_storage_delete on storage.objects;
create policy editorial_storage_delete on storage.objects for delete to authenticated
using(bucket_id='editorial-assets' and exists(select 1 from public.workspace_members wm where wm.workspace_id::text=(storage.foldername(name))[1] and wm.user_id=(select auth.uid())));

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='editorial_items') then alter publication supabase_realtime add table public.editorial_items; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='editorial_steps') then alter publication supabase_realtime add table public.editorial_steps; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='editorial_assets') then alter publication supabase_realtime add table public.editorial_assets; end if;
end $$;

revoke execute on function public.claim_initial_4bit_workspace() from public;
revoke execute on function public.claim_initial_4bit_workspace() from anon;
grant execute on function public.claim_initial_4bit_workspace() to authenticated;
