alter table public.perfis
  add column if not exists card_bg_url text,
  add column if not exists card_bg_meta jsonb;