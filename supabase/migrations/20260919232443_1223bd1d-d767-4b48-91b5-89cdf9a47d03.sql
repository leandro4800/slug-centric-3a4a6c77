
DROP POLICY IF EXISTS ref_exercicios_select ON public.referencia_exercicios;
CREATE POLICY ref_exercicios_select ON public.referencia_exercicios
FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_ref_exercicios_nome_trgm
  ON public.referencia_exercicios USING gin (nome_exercicio extensions.gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.buscar_exercicios_similares(_nome text, _limit integer DEFAULT 5, _threshold real DEFAULT 0.35)
RETURNS TABLE(id uuid, nome_exercicio text, url_video text, tenant_id uuid, tenant_nome text, origem text, similaridade real)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT r.id, r.nome_exercicio, r.url_video, r.tenant_id, t.nome, r.origem,
         extensions.similarity(r.nome_exercicio, _nome) AS similaridade
  FROM public.referencia_exercicios r
  LEFT JOIN public.tenants t ON t.id = r.tenant_id
  WHERE coalesce(trim(_nome), '') <> ''
    AND extensions.similarity(r.nome_exercicio, _nome) > _threshold
  ORDER BY similaridade DESC, r.nome_exercicio
  LIMIT greatest(1, least(_limit, 20));
$$;

REVOKE EXECUTE ON FUNCTION public.buscar_exercicios_similares(text, integer, real) FROM anon;
GRANT EXECUTE ON FUNCTION public.buscar_exercicios_similares(text, integer, real) TO authenticated;

CREATE OR REPLACE FUNCTION public.listar_referencia_exercicios()
RETURNS TABLE(id uuid, nome_exercicio text, url_video text, tenant_id uuid, tenant_nome text, origem text, storage_path text, modalidade text, valencia text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.nome_exercicio, r.url_video, r.tenant_id, t.nome, r.origem, r.storage_path, r.modalidade, r.valencia
  FROM public.referencia_exercicios r
  LEFT JOIN public.tenants t ON t.id = r.tenant_id
  ORDER BY r.nome_exercicio;
$$;

REVOKE EXECUTE ON FUNCTION public.listar_referencia_exercicios() FROM anon;
GRANT EXECUTE ON FUNCTION public.listar_referencia_exercicios() TO authenticated;
