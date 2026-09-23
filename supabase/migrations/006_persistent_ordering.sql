alter table public.clients
  add column if not exists sort_order bigint not null default 0;

alter table public.tasks
  add column if not exists sort_order bigint not null default 0;

create index if not exists clients_workspace_sort_idx
  on public.clients(workspace_id, sort_order);

create index if not exists tasks_workspace_due_sort_idx
  on public.tasks(workspace_id, due_date, sort_order);
