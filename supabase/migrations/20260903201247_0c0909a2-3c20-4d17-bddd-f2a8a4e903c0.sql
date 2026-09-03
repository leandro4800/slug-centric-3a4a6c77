ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS videos_fonte_alunos text NOT NULL DEFAULT 'ambos';

DO $$ BEGIN
  ALTER TABLE public.tenants
    ADD CONSTRAINT tenants_videos_fonte_alunos_check
    CHECK (videos_fonte_alunos IN ('ambos','meus','app'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.tenants
SET videos_fonte_alunos = 'meus'
WHERE COALESCE(usar_apenas_meus_videos, false) = true
  AND videos_fonte_alunos = 'ambos';

CREATE OR REPLACE FUNCTION public.match_referencia_exercicio(_tenant_id uuid, _nome text, _limit integer DEFAULT 3)
RETURNS TABLE(id uuid, nome_exercicio text, url_video text, tenant_id uuid, score real)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH alvo AS (SELECT public.normalizar_nome_exercicio(_nome) AS n),
  fonte AS (
    SELECT COALESCE(t.videos_fonte_alunos, 'ambos') AS f
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
      CASE COALESCE((SELECT f FROM fonte), 'ambos')
        WHEN 'meus' THEN r.tenant_id = _tenant_id
        WHEN 'app'  THEN r.tenant_id IS NULL
        ELSE (r.tenant_id = _tenant_id OR r.tenant_id IS NULL)
      END
    )
  ORDER BY
    (public.normalizar_nome_exercicio(r.nome_exercicio) = (SELECT n FROM alvo)) DESC,
    extensions.similarity(public.normalizar_nome_exercicio(r.nome_exercicio), (SELECT n FROM alvo)) DESC,
    (r.tenant_id IS NOT NULL) DESC
  LIMIT GREATEST(COALESCE(_limit, 3), 1);
$$;