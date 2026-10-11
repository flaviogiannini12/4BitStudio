alter table public.editorial_items
  add column if not exists inspiration_url text not null default '';
