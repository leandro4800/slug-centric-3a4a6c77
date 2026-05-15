ALTER TABLE public.perfis_treino
  ADD COLUMN IF NOT EXISTS pescoco_cm numeric,
  ADD COLUMN IF NOT EXISTS cintura_cm numeric,
  ADD COLUMN IF NOT EXISTS quadril_cm numeric;