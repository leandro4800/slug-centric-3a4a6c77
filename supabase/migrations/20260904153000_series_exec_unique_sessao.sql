-- Impede série duplicada na mesma sessão/exercício (retry após PR falhar não cria 2ª linha).
-- Limpa duplicatas antigas mantendo a mais recente.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY sessao_id, treino_prescrito_id, numero_serie
      ORDER BY concluida_em DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.series_executadas
  WHERE sessao_id IS NOT NULL
    AND treino_prescrito_id IS NOT NULL
)
DELETE FROM public.series_executadas s
USING ranked r
WHERE s.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS series_exec_sessao_ex_num_uidx
  ON public.series_executadas (sessao_id, treino_prescrito_id, numero_serie)
  WHERE sessao_id IS NOT NULL AND treino_prescrito_id IS NOT NULL;
