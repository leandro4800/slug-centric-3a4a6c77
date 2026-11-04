ALTER TABLE public.treinos_prescritos ADD COLUMN IF NOT EXISTS modalidade text NULL;

WITH unica AS (
  SELECT aluno_id, tenant_id, min(modalidade) AS modalidade
  FROM public.aluno_modalidades_luta
  GROUP BY aluno_id, tenant_id
  HAVING count(*) = 1
)
UPDATE public.treinos_prescritos tp
SET modalidade = COALESCE(
  u.modalidade,
  CASE WHEN p.modalidade_luta IN ('bjj','muay_thai','kickboxing','boxe','mma') THEN p.modalidade_luta END
)
FROM public.tenants t, public.perfis p
LEFT JOIN unica u ON u.aluno_id = p.id
WHERE t.id = tp.tenant_id
  AND t.vertical = 'fight'
  AND p.id = tp.aluno_id
  AND (u.tenant_id IS NULL OR u.tenant_id = tp.tenant_id)
  AND tp.modalidade IS NULL;

CREATE INDEX IF NOT EXISTS idx_treinos_prescritos_aluno_modalidade ON public.treinos_prescritos (aluno_id, modalidade);

CREATE POLICY "Coach e admin do tenant inserem modalidades" ON public.aluno_modalidades_luta
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'coach'::app_role, tenant_id) OR has_role(auth.uid(), 'admin'::app_role, NULL::uuid));

CREATE POLICY "Coach e admin do tenant atualizam modalidades" ON public.aluno_modalidades_luta
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'coach'::app_role, tenant_id) OR has_role(auth.uid(), 'admin'::app_role, NULL::uuid))
WITH CHECK (has_role(auth.uid(), 'coach'::app_role, tenant_id) OR has_role(auth.uid(), 'admin'::app_role, NULL::uuid));

CREATE POLICY "Coach e admin do tenant removem modalidades" ON public.aluno_modalidades_luta
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'coach'::app_role, tenant_id) OR has_role(auth.uid(), 'admin'::app_role, NULL::uuid));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aluno_modalidades_luta TO authenticated;