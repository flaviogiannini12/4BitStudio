alter table public.editorial_items
add column if not exists media_kind text not null default 'photo';

alter table public.editorial_items
drop constraint if exists editorial_items_media_kind_check;

alter table public.editorial_items
add constraint editorial_items_media_kind_check
check (media_kind in ('photo','video'));

update public.editorial_items
set status='to_produce'
where status not in ('to_produce','review','ready','published','archived');
