CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

ALTER TABLE public.treinos_prescritos
  ADD COLUMN IF NOT EXISTS referencia_exercicio_id uuid REFERENCES public.referencia_exercicios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_treinos_prescritos_ref_exercicio
  ON public.treinos_prescritos(referencia_exercicio_id);

CREATE OR REPLACE FUNCTION public.normalizar_nome_exercicio(_nome text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT btrim(regexp_replace(
    regexp_replace(
      lower(translate(coalesce(_nome, ''),
        'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
        'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn')),
      '[^a-z0-9]+', ' ', 'g'),
    '\s+', ' ', 'g'));
$$;

CREATE INDEX IF NOT EXISTS idx_referencia_exercicios_nome_trgm
  ON public.referencia_exercicios USING gin (public.normalizar_nome_exercicio(nome_exercicio) extensions.gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.match_referencia_exercicio(_tenant_id uuid, _nome text, _limit integer DEFAULT 3)
RETURNS TABLE(id uuid, nome_exercicio text, url_video text, tenant_id uuid, score real)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH alvo AS (SELECT public.normalizar_nome_exercicio(_nome) AS n),
  apenas_meus AS (
    SELECT COALESCE(t.usar_apenas_meus_videos, false) AS v
    FROM public.tenants t WHERE t.id = _tenant_id
  )
  SELECT r.id,
         r.nome_exercicio,
         r.url_video,
         r.tenant_id,
         extensions.similarity(public.normalizar_nome_exercicio(r.nome_exercicio), (SELECT n FROM alvo))::real AS score
  FROM public.referencia_exercicios r
  WHERE r.url_video IS NOT NULL
    AND (SELECT n FROM alvo) <> ''
    AND (
      r.tenant_id = _tenant_id
      OR (r.tenant_id IS NULL AND NOT COALESCE((SELECT v FROM apenas_meus), false))
    )
  ORDER BY
    (public.normalizar_nome_exercicio(r.nome_exercicio) = (SELECT n FROM alvo)) DESC,
    extensions.similarity(public.normalizar_nome_exercicio(r.nome_exercicio), (SELECT n FROM alvo)) DESC,
    (r.tenant_id IS NOT NULL) DESC
  LIMIT GREATEST(COALESCE(_limit, 3), 1);
$$;

GRANT EXECUTE ON FUNCTION public.match_referencia_exercicio(uuid, text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalizar_nome_exercicio(text) TO authenticated, anon, service_role;

-- Backfill: casa video_url já gravado com a biblioteca (URL exata ou mesmo ID do YouTube)
UPDATE public.treinos_prescritos tp
SET referencia_exercicio_id = r.id
FROM public.referencia_exercicios r
WHERE tp.referencia_exercicio_id IS NULL
  AND tp.video_url IS NOT NULL
  AND r.url_video IS NOT NULL
  AND (r.tenant_id = tp.tenant_id OR r.tenant_id IS NULL)
  AND (
    r.url_video = tp.video_url
    OR (
      (regexp_match(r.url_video, '(?:youtu\.be/|[?&]v=|/shorts/|/live/|/embed/)([A-Za-z0-9_-]{11})'))[1] IS NOT NULL
      AND (regexp_match(r.url_video, '(?:youtu\.be/|[?&]v=|/shorts/|/live/|/embed/)([A-Za-z0-9_-]{11})'))[1]
        = (regexp_match(tp.video_url, '(?:youtu\.be/|[?&]v=|/shorts/|/live/|/embed/)([A-Za-z0-9_-]{11})'))[1]
    )
  );

-- Backfill 2: nomes idênticos após normalização
UPDATE public.treinos_prescritos tp
SET referencia_exercicio_id = r.id
FROM public.referencia_exercicios r
WHERE tp.referencia_exercicio_id IS NULL
  AND r.url_video IS NOT NULL
  AND (r.tenant_id = tp.tenant_id OR r.tenant_id IS NULL)
  AND public.normalizar_nome_exercicio(r.nome_exercicio) = public.normalizar_nome_exercicio(tp.exercicio)
  AND public.normalizar_nome_exercicio(tp.exercicio) <> '';