ALTER TABLE public.avaliacao_avulsa_alunos
  ADD COLUMN IF NOT EXISTS dieta_json jsonb,
  ADD COLUMN IF NOT EXISTS treino_json jsonb;