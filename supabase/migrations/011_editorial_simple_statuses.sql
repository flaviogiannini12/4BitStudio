alter table public.editorial_items
alter column status set default 'to_produce';

update public.editorial_items
set status='to_produce'
where status in ('idea','in_progress','review','scheduled');
