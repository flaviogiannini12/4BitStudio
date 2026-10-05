alter table public.editorial_items
drop constraint if exists editorial_items_whatsapp_casaro_only;

alter table public.editorial_items
add constraint editorial_items_whatsapp_casaro_only
check (not (account = 'autoscuola_susa' and 'whatsapp' = any(platforms)));

with francesco as (
  select id from public.team_members where lower(name)='francesco' limit 1
)
update public.editorial_steps s
set
  owner_member_id = (select id from francesco),
  label = case s.label
    when 'Ideazione / Script' then 'WhatsApp · Ideazione'
    when 'Preparazione contenuto WhatsApp' then 'WhatsApp · Preparazione contenuto'
    when 'Description / Copy' then 'WhatsApp · Copy'
    when 'Invio WhatsApp' then 'WhatsApp · Invio'
    else s.label
  end
from public.editorial_items i
where s.editorial_item_id=i.id
  and 'whatsapp'=any(i.platforms);

update public.editorial_steps s
set label = case s.label
  when 'Ideazione / Script' then 'Ideazione / Script social'
  when 'Video editing' then 'Video editing social'
  when 'Photo editing / Grafiche' then 'Photo editing / Grafiche social'
  when 'Description / Copy' then 'Description / Copy social'
  else s.label
end
from public.editorial_items i
where s.editorial_item_id=i.id
  and not ('whatsapp'=any(i.platforms));
