
-- Coaches/admins/tenant owners precisam poder gerenciar refeições das dietas dos seus alunos
CREATE POLICY "refeicoes_coach_insert"
ON public.refeicoes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dietas d
    JOIN public.perfis p ON p.id = d.user_id
    LEFT JOIN public.tenants t ON t.id = p.tenant_id
    WHERE d.id = refeicoes.dieta_id
      AND (t.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'coach'::public.app_role, p.tenant_id))
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "refeicoes_coach_update"
ON public.refeicoes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.dietas d
    JOIN public.perfis p ON p.id = d.user_id
    LEFT JOIN public.tenants t ON t.id = p.tenant_id
    WHERE d.id = refeicoes.dieta_id
      AND (t.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'coach'::public.app_role, p.tenant_id))
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "refeicoes_coach_delete"
ON public.refeicoes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.dietas d
    JOIN public.perfis p ON p.id = d.user_id
    LEFT JOIN public.tenants t ON t.id = p.tenant_id
    WHERE d.id = refeicoes.dieta_id
      AND (t.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'coach'::public.app_role, p.tenant_id))
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
