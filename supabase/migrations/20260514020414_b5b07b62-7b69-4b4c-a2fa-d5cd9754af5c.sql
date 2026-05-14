
CREATE POLICY "dietas_coach_insert" ON public.dietas FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.perfis p
    LEFT JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.id = dietas.user_id
      AND (t.owner_user_id = auth.uid() OR has_role(auth.uid(), 'coach'::app_role, p.tenant_id))
  )
);

CREATE POLICY "dietas_coach_update" ON public.dietas FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.perfis p
    LEFT JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.id = dietas.user_id
      AND (t.owner_user_id = auth.uid() OR has_role(auth.uid(), 'coach'::app_role, p.tenant_id))
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.perfis p
    LEFT JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.id = dietas.user_id
      AND (t.owner_user_id = auth.uid() OR has_role(auth.uid(), 'coach'::app_role, p.tenant_id))
  )
);

CREATE POLICY "dietas_coach_delete" ON public.dietas FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.perfis p
    LEFT JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.id = dietas.user_id
      AND (t.owner_user_id = auth.uid() OR has_role(auth.uid(), 'coach'::app_role, p.tenant_id))
  )
);

-- Publicar a última dieta gerada do Atila para corrigir a situação atual
UPDATE public.dietas SET is_published = true
WHERE id = '00ce52e6-5664-49b5-ba3a-7192555094fe';
