alter table public.editorial_items
add column if not exists platforms text[] not null default '{}';

update public.editorial_items
set platforms = case platform
  when 'fb_ig' then array['facebook']::text[]
  when 'tiktok' then array['tiktok']::text[]
  when 'youtube' then array['youtube']::text[]
  when 'whatsapp' then array['whatsapp']::text[]
  else array['facebook']::text[]
end
where cardinality(platforms)=0;

alter table public.editorial_items
drop constraint if exists editorial_items_platforms_check;

alter table public.editorial_items
add constraint editorial_items_platforms_check
check (
  cardinality(platforms) > 0
  and platforms <@ array['facebook','tiktok','youtube','whatsapp']::text[]
);
