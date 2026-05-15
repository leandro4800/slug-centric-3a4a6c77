ALTER TABLE public.historico_cargas
  ADD COLUMN IF NOT EXISTS tipo_serie text,
  ADD COLUMN IF NOT EXISTS serie_index integer;

CREATE INDEX IF NOT EXISTS idx_historico_cargas_user_exercicio_data
  ON public.historico_cargas (user_id, exercicio_nome, data_treino DESC);