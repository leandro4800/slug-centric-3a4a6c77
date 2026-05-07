CREATE POLICY "tenants_select_active_subscribers"
ON public.tenants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assinaturas a
    WHERE a.tenant_id = tenants.id
      AND a.aluno_id = auth.uid()
      AND a.status IN ('active', 'trialing')
  )
);
