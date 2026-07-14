
-- anamnese_aluno: bind aluno branch to their tenant
DROP POLICY IF EXISTS anamnese_insert ON public.anamnese_aluno;
CREATE POLICY anamnese_insert ON public.anamnese_aluno FOR INSERT WITH CHECK (
  (aluno_id = auth.uid() AND tenant_id = public.current_user_tenant())
  OR (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = anamnese_aluno.tenant_id AND t.owner_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'coach'::app_role, tenant_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS anamnese_update ON public.anamnese_aluno;
CREATE POLICY anamnese_update ON public.anamnese_aluno FOR UPDATE
USING (
  (aluno_id = auth.uid())
  OR (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = anamnese_aluno.tenant_id AND t.owner_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'coach'::app_role, tenant_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (aluno_id = auth.uid() AND tenant_id = public.current_user_tenant())
  OR (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = anamnese_aluno.tenant_id AND t.owner_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'coach'::app_role, tenant_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- avaliacoes_fisicas
DROP POLICY IF EXISTS avaliacoes_insert ON public.avaliacoes_fisicas;
CREATE POLICY avaliacoes_insert ON public.avaliacoes_fisicas FOR INSERT WITH CHECK (
  (aluno_id = auth.uid() AND tenant_id = public.current_user_tenant())
  OR (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = avaliacoes_fisicas.tenant_id AND t.owner_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'coach'::app_role, tenant_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS avaliacoes_update ON public.avaliacoes_fisicas;
CREATE POLICY avaliacoes_update ON public.avaliacoes_fisicas FOR UPDATE
USING (
  (aluno_id = auth.uid())
  OR (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = avaliacoes_fisicas.tenant_id AND t.owner_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'coach'::app_role, tenant_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (aluno_id = auth.uid() AND tenant_id = public.current_user_tenant())
  OR (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = avaliacoes_fisicas.tenant_id AND t.owner_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'coach'::app_role, tenant_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- cartas_atleta
DROP POLICY IF EXISTS cartas_insert ON public.cartas_atleta;
CREATE POLICY cartas_insert ON public.cartas_atleta FOR INSERT WITH CHECK (
  (aluno_id = auth.uid() AND tenant_id = public.current_user_tenant())
  OR (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = cartas_atleta.tenant_id AND t.owner_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'coach'::app_role, tenant_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS cartas_update ON public.cartas_atleta;
CREATE POLICY cartas_update ON public.cartas_atleta FOR UPDATE
USING (
  (aluno_id = auth.uid())
  OR (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = cartas_atleta.tenant_id AND t.owner_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'coach'::app_role, tenant_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (aluno_id = auth.uid() AND tenant_id = public.current_user_tenant())
  OR (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = cartas_atleta.tenant_id AND t.owner_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'coach'::app_role, tenant_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- historico_cargas: bind update to current tenant
DROP POLICY IF EXISTS hc_update_own ON public.historico_cargas;
CREATE POLICY hc_update_own ON public.historico_cargas FOR UPDATE
USING (user_id = auth.uid() AND tenant_id = public.current_user_tenant())
WITH CHECK (user_id = auth.uid() AND tenant_id = public.current_user_tenant());
