CREATE POLICY itens_refeicao_coach_view ON public.itens_refeicao FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1
    FROM refeicoes r
    JOIN dietas d ON d.id = r.dieta_id
    JOIN perfis p ON p.id = d.user_id
    LEFT JOIN tenants t ON t.id = p.tenant_id
    WHERE r.id = itens_refeicao.refeicao_id
      AND (t.owner_user_id = auth.uid() OR has_role(auth.uid(), 'coach'::app_role, p.tenant_id))
  )
);

CREATE POLICY itens_refeicao_coach_update ON public.itens_refeicao FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1
    FROM refeicoes r
    JOIN dietas d ON d.id = r.dieta_id
    JOIN perfis p ON p.id = d.user_id
    LEFT JOIN tenants t ON t.id = p.tenant_id
    WHERE r.id = itens_refeicao.refeicao_id
      AND (t.owner_user_id = auth.uid() OR has_role(auth.uid(), 'coach'::app_role, p.tenant_id))
  )
);