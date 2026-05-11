ALTER TABLE public.perfis 
  ADD COLUMN IF NOT EXISTS avatar_treinando_url text,
  ADD COLUMN IF NOT EXISTS avatar_celebracao_url text;