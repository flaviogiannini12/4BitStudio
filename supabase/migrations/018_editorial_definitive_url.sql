alter table public.editorial_items
  add column if not exists definitive_url text not null default '';
