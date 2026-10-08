alter table public.payments
  add column if not exists invoiced boolean not null default false;

alter table public.recurrences
  add column if not exists invoiced boolean not null default false;

update public.payments p
set invoiced = true
from public.clients c
where p.client_id = c.id
  and c.name in ('Fattorie Casaro','Autoscuola Susa');

update public.recurrences r
set invoiced = true
from public.clients c
where r.client_id = c.id
  and c.name in ('Fattorie Casaro','Autoscuola Susa');
