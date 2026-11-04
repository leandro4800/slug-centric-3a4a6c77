CREATE TABLE public.aluno_modalidades_luta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL,
  modalidade text NOT NULL,
  nivel text NOT NULL DEFAULT 'iniciante',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aluno_modalidades_luta_unq UNIQUE (aluno_id, modalidade),
  CONSTRAINT aluno_modalidades_luta_nivel_chk CHECK (nivel IN ('iniciante','intermediario','avancado')),
  CONSTRAINT aluno_modalidades_luta_mod_chk CHECK (modalidade IN ('bjj','muay_thai','kickboxing','boxe','mma'))
);
CREATE INDEX idx_aluno_modalidades_luta_tenant_aluno ON public.aluno_modalidades_luta(tenant_id, aluno_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aluno_modalidades_luta TO authenticated;
GRANT ALL ON public.aluno_modalidades_luta TO service_role;

ALTER TABLE public.aluno_modalidades_luta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno gerencia as próprias modalidades"
ON public.aluno_modalidades_luta FOR ALL TO authenticated
USING (aluno_id = auth.uid() AND tenant_id = public.perfis_stored_tenant(auth.uid()))
WITH CHECK (aluno_id = auth.uid() AND tenant_id = public.perfis_stored_tenant(auth.uid()));

CREATE POLICY "Coach e admin do tenant leem modalidades"
ON public.aluno_modalidades_luta FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'coach'::app_role, tenant_id) OR public.has_role(auth.uid(), 'admin'::app_role, NULL));

INSERT INTO public.aluno_modalidades_luta (tenant_id, aluno_id, modalidade)
SELECT p.tenant_id, p.id, m.slug
FROM public.perfis p
CROSS JOIN LATERAL (
  SELECT s.slug FROM (VALUES ('bjj','bjj'),('muay_thai','muaythai'),('kickboxing','kickboxing'),('boxe','boxe'),('mma','mma')) s(slug, n)
  WHERE regexp_replace(lower(p.modalidade_luta), '[^a-z0-9]', '', 'g') IN (s.n, replace(s.slug,'_',''))
) m
WHERE p.modalidade_luta IS NOT NULL AND p.tenant_id IS NOT NULL
ON CONFLICT (aluno_id, modalidade) DO NOTHING;