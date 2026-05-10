
ALTER FUNCTION public.current_user_tenant() SET search_path = public;
ALTER FUNCTION public.user_belongs_to_tenant(uuid, uuid) SET search_path = public;

DROP POLICY IF EXISTS parceiros_select_tenant ON public.parceiros;
CREATE POLICY parceiros_select_coach_or_owner
  ON public.parceiros
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = parceiros.tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'coach'::app_role, tenant_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "exames_select_coach"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'exames_pdfs'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1
        FROM public.perfis p
        JOIN public.tenants t ON t.id = p.tenant_id
        WHERE p.id::text = (storage.foldername(name))[1]
          AND (t.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'coach'::app_role, p.tenant_id))
      )
    )
  );

CREATE POLICY "evolucao_fotos_select_coach"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'evolucao-fotos'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1
        FROM public.perfis p
        JOIN public.tenants t ON t.id = p.tenant_id
        WHERE p.id::text = (storage.foldername(name))[1]
          AND (t.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'coach'::app_role, p.tenant_id))
      )
    )
  );
