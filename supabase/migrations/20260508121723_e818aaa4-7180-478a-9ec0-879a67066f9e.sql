
-- evolucao_checkins
CREATE POLICY evolucao_checkins_coach_view ON public.evolucao_checkins FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.perfis p
    JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.id = evolucao_checkins.user_id
      AND (t.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'coach'::public.app_role, p.tenant_id))
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- evolucao_metricas
CREATE POLICY evolucao_metricas_coach_view ON public.evolucao_metricas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.perfis p
    JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.id = evolucao_metricas.user_id
      AND (t.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'coach'::public.app_role, p.tenant_id))
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- evolucao_fotos
CREATE POLICY evolucao_fotos_coach_view ON public.evolucao_fotos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.perfis p
    JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.id = evolucao_fotos.user_id
      AND (t.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'coach'::public.app_role, p.tenant_id))
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- analises_clinicas
CREATE POLICY analises_coach_view ON public.analises_clinicas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.perfis p
    JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.id = analises_clinicas.user_id
      AND (t.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'coach'::public.app_role, p.tenant_id))
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- exames_biomarcadores
CREATE POLICY biomarcadores_coach_view ON public.exames_biomarcadores FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.perfis p
    JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.id = exames_biomarcadores.user_id
      AND (t.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'coach'::public.app_role, p.tenant_id))
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
