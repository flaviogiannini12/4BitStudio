create or replace function public.claim_initial_4bit_workspace()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_workspace uuid;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select wm.workspace_id into v_workspace
  from public.workspace_members wm
  where wm.user_id = v_user
  limit 1;

  if v_workspace is not null then
    return v_workspace;
  end if;

  lock table public.workspace_members in share row exclusive mode;

  select wm.workspace_id into v_workspace
  from public.workspace_members wm
  where wm.user_id = v_user
  limit 1;

  if v_workspace is not null then
    return v_workspace;
  end if;

  if exists (select 1 from public.workspace_members) then
    return null;
  end if;

  select w.id into v_workspace
  from public.workspaces w
  order by w.created_at asc
  limit 1;

  if v_workspace is null then
    raise exception 'Workspace not found';
  end if;

  insert into public.workspace_members (workspace_id, user_id)
  values (v_workspace, v_user)
  on conflict do nothing;

  return v_workspace;
end;
$$;

revoke all on function public.claim_initial_4bit_workspace() from public;
grant execute on function public.claim_initial_4bit_workspace() to authenticated;
