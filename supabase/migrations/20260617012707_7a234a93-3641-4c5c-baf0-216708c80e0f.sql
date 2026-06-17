CREATE POLICY "perfis_select_same_tenant" ON public.perfis FOR SELECT TO authenticated USING (
  tenant_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.perfis me
    WHERE me.id = auth.uid() AND me.tenant_id = perfis.tenant_id
  )
);