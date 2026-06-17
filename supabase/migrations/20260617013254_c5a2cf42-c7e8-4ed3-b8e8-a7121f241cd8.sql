DROP POLICY IF EXISTS "perfis_select_same_tenant" ON public.perfis;

CREATE POLICY "perfis_select_same_tenant" ON public.perfis
FOR SELECT TO authenticated
USING (
  tenant_id IS NOT NULL
  AND tenant_id = public.get_user_tenant_id(auth.uid())
);