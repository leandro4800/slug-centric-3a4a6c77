REVOKE ALL ON public.series_executadas FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.series_executadas TO authenticated;
GRANT ALL ON public.series_executadas TO service_role;

ALTER TABLE public.series_executadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aluno gerencia suas series" ON public.series_executadas;
CREATE POLICY "Aluno gerencia suas series"
ON public.series_executadas FOR ALL TO authenticated
USING (aluno_id = auth.uid())
WITH CHECK (aluno_id = auth.uid() AND tenant_id IS NOT NULL AND public.user_belongs_to_tenant(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Staff ve series do tenant" ON public.series_executadas;
CREATE POLICY "Staff ve series do tenant"
ON public.series_executadas FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (tenant_id IS NOT NULL AND public.has_role(auth.uid(), 'coach'::app_role, tenant_id))
  OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = series_executadas.tenant_id AND t.owner_user_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_series_exec_hist ON public.series_executadas (aluno_id, treino_prescrito_id, numero_serie, concluida_em DESC);