
-- Permitir que coach/owner do tenant veja dietas dos seus alunos
CREATE POLICY "dietas_coach_view"
ON public.dietas
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.perfis p
    LEFT JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.id = dietas.user_id
      AND (
        t.owner_user_id = auth.uid()
        OR public.has_role(auth.uid(), 'coach'::public.app_role, p.tenant_id)
      )
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Permitir que coach/owner do tenant veja as refeições das dietas dos seus alunos
CREATE POLICY "refeicoes_coach_view"
ON public.refeicoes
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.dietas d
    JOIN public.perfis p ON p.id = d.user_id
    LEFT JOIN public.tenants t ON t.id = p.tenant_id
    WHERE d.id = refeicoes.dieta_id
      AND (
        t.owner_user_id = auth.uid()
        OR public.has_role(auth.uid(), 'coach'::public.app_role, p.tenant_id)
      )
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
