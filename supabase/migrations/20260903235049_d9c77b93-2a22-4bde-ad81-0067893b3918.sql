-- 1) desvincula PRs que apontam para duplicatas que serão removidas
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY sessao_id, treino_prescrito_id, numero_serie
           ORDER BY concluida_em DESC NULLS LAST, created_at DESC
         ) AS rn
  FROM public.series_executadas
)
UPDATE public.prs p
SET series_executada_id = NULL
FROM ranked r
WHERE r.rn > 1 AND p.series_executada_id = r.id;

-- 2) remove as duplicatas mantendo a mais recente
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY sessao_id, treino_prescrito_id, numero_serie
           ORDER BY concluida_em DESC NULLS LAST, created_at DESC
         ) AS rn
  FROM public.series_executadas
)
DELETE FROM public.series_executadas s
USING ranked r
WHERE s.id = r.id AND r.rn > 1;

-- 3) impede novas duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS series_executadas_sessao_exercicio_serie_uidx
  ON public.series_executadas (sessao_id, treino_prescrito_id, numero_serie)
  NULLS NOT DISTINCT;