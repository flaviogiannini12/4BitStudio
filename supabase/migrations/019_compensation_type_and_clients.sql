alter table public.compensations
  add column if not exists client_ids uuid[] not null default '{}'::uuid[],
  add column if not exists compensation_type text not null default 'one_off';

update public.compensations
set client_ids = array[client_id]
where client_id is not null
  and coalesce(array_length(client_ids,1),0)=0;

alter table public.compensations
  drop constraint if exists compensations_compensation_type_check;

alter table public.compensations
  add constraint compensations_compensation_type_check
  check (compensation_type in ('one_off','salary_recurring'));
