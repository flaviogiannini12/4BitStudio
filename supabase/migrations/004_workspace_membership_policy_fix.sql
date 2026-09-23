drop policy if exists "members_select_memberships" on public.workspace_members;
create policy "members_select_own_memberships"
on public.workspace_members for select to authenticated
using (user_id = (select auth.uid()));
