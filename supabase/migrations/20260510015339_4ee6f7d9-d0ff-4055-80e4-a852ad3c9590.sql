ALTER TABLE public.anamnese_aluno
  ADD COLUMN IF NOT EXISTS alimentos_basicos_casa text,
  ADD COLUMN IF NOT EXISTS cafe_lanche_habitual text,
  ADD COLUMN IF NOT EXISTS proteinas_consumidas text,
  ADD COLUMN IF NOT EXISTS frutas_vegetais_preferidos text,
  ADD COLUMN IF NOT EXISTS horario_almoco text,
  ADD COLUMN IF NOT EXISTS horario_jantar text,
  ADD COLUMN IF NOT EXISTS nivel_atividade_diaria text;