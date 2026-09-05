ALTER TABLE public.base_conhecimento_treino
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'geral';

CREATE INDEX IF NOT EXISTS base_conhecimento_treino_categoria_idx
  ON public.base_conhecimento_treino (categoria);

DROP FUNCTION IF EXISTS public.buscar_conhecimento_treino(extensions.vector, uuid, integer, double precision);

CREATE OR REPLACE FUNCTION public.buscar_conhecimento_treino(
  query_embedding extensions.vector,
  p_tenant_id uuid DEFAULT NULL::uuid,
  match_count integer DEFAULT 8,
  similarity_threshold double precision DEFAULT 0.3,
  p_categoria text DEFAULT NULL::text
)
RETURNS TABLE(id uuid, titulo text, conteudo text, fonte text, tenant_id uuid, similarity double precision)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT b.id, b.titulo, b.conteudo, b.fonte, b.tenant_id,
         1 - (b.embedding <=> query_embedding) AS similarity
  FROM public.base_conhecimento_treino b
  WHERE b.embedding IS NOT NULL
    AND (p_tenant_id IS NULL OR b.tenant_id = p_tenant_id OR b.tenant_id IS NULL)
    AND (p_categoria IS NULL OR b.categoria = p_categoria OR b.categoria = 'geral')
    AND (1 - (b.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY b.embedding <=> query_embedding
  LIMIT GREATEST(match_count, 1);
$function$;