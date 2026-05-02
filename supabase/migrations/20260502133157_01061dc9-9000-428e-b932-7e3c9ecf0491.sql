-- Tabela de catálogo de templates de treino (extraídos da base de conhecimento)
CREATE TABLE IF NOT EXISTS public.templates_treino (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NULL, -- null = global (admin); preenchido = template do coach
  codigo text NOT NULL, -- ex: "22_TREINO_PARA_MULHERES_4X_SEMANA_AB"
  titulo text NOT NULL, -- ex: "Treino para Mulheres 4x na Semana (AB)"
  publico text NOT NULL DEFAULT 'unisex', -- 'masculino' | 'feminino' | 'unisex'
  nivel text NOT NULL DEFAULT 'iniciante', -- 'adaptacao' | 'iniciante' | 'intermediario' | 'avancado' | 'super_avancado'
  frequencia_semanal int NULL, -- 2,3,4,5,6
  divisao text NULL, -- 'AB' | 'ABC' | 'ABCD' | 'ABCDE' | 'ABCDEF' | 'PPL' | 'UPPER_LOWER' | 'PPL_ABC'
  enfase text NULL, -- 'inferiores' | 'superiores' | 'quadriceps' | etc
  objetivo text NULL, -- 'hipertrofia' | 'forca' | 'adaptacao' | 'estetica'
  fonte_arquivo text NOT NULL, -- caminho/nome do PDF original
  resumo text NULL, -- descrição curta do treino
  conteudo_completo text NULL, -- texto extraído integral do PDF (referência rápida)
  tags text[] DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_treino_publico ON public.templates_treino(publico);
CREATE INDEX IF NOT EXISTS idx_templates_treino_nivel ON public.templates_treino(nivel);
CREATE INDEX IF NOT EXISTS idx_templates_treino_freq ON public.templates_treino(frequencia_semanal);
CREATE INDEX IF NOT EXISTS idx_templates_treino_divisao ON public.templates_treino(divisao);
CREATE INDEX IF NOT EXISTS idx_templates_treino_tenant ON public.templates_treino(tenant_id);

ALTER TABLE public.templates_treino ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado pode ler templates globais ou do seu tenant
CREATE POLICY "templates_treino_select"
ON public.templates_treino FOR SELECT
TO authenticated
USING (
  ativo = true AND (
    tenant_id IS NULL
    OR tenant_id = public.current_user_tenant()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'coach'::app_role, tenant_id)
  )
);

-- Insert: admin (qualquer escopo) ou coach/owner do tenant
CREATE POLICY "templates_treino_insert"
ON public.templates_treino FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (tenant_id IS NOT NULL AND (
    public.has_role(auth.uid(), 'coach'::app_role, tenant_id)
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid())
  ))
);

CREATE POLICY "templates_treino_update"
ON public.templates_treino FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (tenant_id IS NOT NULL AND (
    public.has_role(auth.uid(), 'coach'::app_role, tenant_id)
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid())
  ))
);

CREATE POLICY "templates_treino_delete"
ON public.templates_treino FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (tenant_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid()))
);

CREATE TRIGGER trg_templates_treino_updated_at
BEFORE UPDATE ON public.templates_treino
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função de busca de templates por critérios estruturados
CREATE OR REPLACE FUNCTION public.buscar_templates_treino(
  p_publico text DEFAULT NULL,
  p_nivel text DEFAULT NULL,
  p_frequencia int DEFAULT NULL,
  p_divisao text DEFAULT NULL,
  p_enfase text DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  codigo text,
  titulo text,
  publico text,
  nivel text,
  frequencia_semanal int,
  divisao text,
  enfase text,
  resumo text,
  conteudo_completo text,
  fonte_arquivo text,
  score int
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id, t.codigo, t.titulo, t.publico, t.nivel, t.frequencia_semanal,
    t.divisao, t.enfase, t.resumo, t.conteudo_completo, t.fonte_arquivo,
    (
      (CASE WHEN p_publico IS NULL OR t.publico = p_publico OR t.publico = 'unisex' THEN 3 ELSE 0 END) +
      (CASE WHEN p_nivel IS NULL OR t.nivel = p_nivel THEN 3 ELSE 0 END) +
      (CASE WHEN p_frequencia IS NULL OR t.frequencia_semanal = p_frequencia THEN 3 ELSE 0 END) +
      (CASE WHEN p_divisao IS NULL OR t.divisao = p_divisao THEN 2 ELSE 0 END) +
      (CASE WHEN p_enfase IS NULL OR t.enfase = p_enfase THEN 2 ELSE 0 END)
    ) AS score
  FROM public.templates_treino t
  WHERE t.ativo = true
    AND (t.tenant_id IS NULL OR t.tenant_id = p_tenant_id)
    AND (p_publico IS NULL OR t.publico = p_publico OR t.publico = 'unisex')
  ORDER BY score DESC, t.frequencia_semanal NULLS LAST
  LIMIT p_limit;
$$;