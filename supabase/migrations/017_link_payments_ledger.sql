alter table public.ledger_entries
  add column if not exists payment_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.ledger_entries'::regclass
      and conname='ledger_entries_payment_id_fkey'
  ) then
    alter table public.ledger_entries
      add constraint ledger_entries_payment_id_fkey
      foreign key (payment_id) references public.payments(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.ledger_entries'::regclass
      and conname='ledger_entries_payment_id_key'
  ) then
    alter table public.ledger_entries
      add constraint ledger_entries_payment_id_key unique (payment_id);
  end if;
end $$;

with matches as (
  select
    l.id as ledger_id,
    p.id as payment_id,
    row_number() over (
      partition by p.id
      order by
        case when l.entry_date = p.paid_at::date then 0 else 1 end,
        l.created_at asc
    ) as rn
  from public.payments p
  join public.ledger_entries l
    on l.payment_id is null
   and l.direction='income'
   and l.client_id is not distinct from p.client_id
   and lower(trim(l.description))=lower(trim(p.label))
   and abs(l.amount - round((case when p.invoiced then p.amount*1.04+2 else p.amount end)::numeric,2)) < 0.01
  where p.status='paid'
)
update public.ledger_entries l
set payment_id=m.payment_id,
    status='Incassato',
    category=case when trim(coalesce(l.category,''))='' then 'Incasso' else l.category end
from matches m
where l.id=m.ledger_id
  and m.rn=1
  and not exists (
    select 1 from public.ledger_entries x
    where x.payment_id=m.payment_id
  );

insert into public.ledger_entries (
  workspace_id,entry_date,direction,client_id,description,amount,status,category,notes,payment_id
)
select
  p.workspace_id,
  coalesce(p.paid_at::date,p.due_date),
  'income',
  p.client_id,
  p.label,
  round((case when p.invoiced then p.amount*1.04+2 else p.amount end)::numeric,2),
  'Incassato',
  'Incasso',
  '',
  p.id
from public.payments p
where p.status='paid'
  and not exists (
    select 1 from public.ledger_entries l where l.payment_id=p.id
  );
