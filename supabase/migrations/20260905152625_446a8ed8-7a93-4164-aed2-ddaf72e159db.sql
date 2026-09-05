CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.base_conhecimento_treino (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  conteudo text NOT NULL,
  fonte text,
  embedding extensions.vector(1536),
  created_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.base_conhecimento_treino TO authenticated;
GRANT ALL ON public.base_conhecimento_treino TO service_role;

ALTER TABLE public.base_conhecimento_treino ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conhecimento_select_tenant_ou_global"
ON public.base_conhecimento_treino FOR SELECT TO authenticated
USING (
  tenant_id IS NULL
  OR public.user_belongs_to_tenant(auth.uid(), tenant_id)
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "conhecimento_delete_dono_tenant"
ON public.base_conhecimento_treino FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (tenant_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid()
  ))
);

CREATE INDEX IF NOT EXISTS base_conhecimento_treino_tenant_idx
  ON public.base_conhecimento_treino (tenant_id);

CREATE OR REPLACE FUNCTION public.buscar_conhecimento_treino(
  query_embedding extensions.vector(1536),
  p_tenant_id uuid DEFAULT NULL,
  match_count integer DEFAULT 8,
  similarity_threshold double precision DEFAULT 0.3
)
RETURNS TABLE(id uuid, titulo text, conteudo text, fonte text, tenant_id uuid, similarity double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT b.id, b.titulo, b.conteudo, b.fonte, b.tenant_id,
         1 - (b.embedding <=> query_embedding) AS similarity
  FROM public.base_conhecimento_treino b
  WHERE b.embedding IS NOT NULL
    AND (p_tenant_id IS NULL OR b.tenant_id = p_tenant_id OR b.tenant_id IS NULL)
    AND (1 - (b.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY b.embedding <=> query_embedding
  LIMIT GREATEST(match_count, 1);
$$;