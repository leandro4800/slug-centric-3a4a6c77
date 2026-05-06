-- 1) Restringe colunas sensíveis na tabela tenants para anon/authenticated
REVOKE SELECT (vlog_webhook_secret, stripe_account_id, stripe_onboarding_completed)
  ON public.tenants FROM anon, authenticated;

-- 2) referencia_exercicios: scoped write
DROP POLICY IF EXISTS "Permitir modificação para admins e coaches" ON public.referencia_exercicios;

CREATE POLICY "ref_exercicios_admin_all"
  ON public.referencia_exercicios
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "ref_exercicios_coach_insert"
  ON public.referencia_exercicios
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'coach'::public.app_role)
    AND profissional_id = auth.uid()
  );

CREATE POLICY "ref_exercicios_coach_update"
  ON public.referencia_exercicios
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'coach'::public.app_role)
    AND profissional_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'coach'::public.app_role)
    AND profissional_id = auth.uid()
  );

CREATE POLICY "ref_exercicios_coach_delete"
  ON public.referencia_exercicios
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'coach'::public.app_role)
    AND profissional_id = auth.uid()
  );

-- 3) vlog_videos bucket: scope to user's own tenant folder
-- Estrutura: {tenant_id}/{filename}
DROP POLICY IF EXISTS "vlog_videos auth insert" ON storage.objects;
DROP POLICY IF EXISTS "vlog_videos auth update" ON storage.objects;
DROP POLICY IF EXISTS "vlog_videos auth delete" ON storage.objects;

CREATE POLICY "vlog_videos owner insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vlog_videos'
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = ((storage.foldername(name))[1])::uuid
        AND (t.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  );

CREATE POLICY "vlog_videos owner update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vlog_videos'
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = ((storage.foldername(name))[1])::uuid
        AND (t.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  )
  WITH CHECK (
    bucket_id = 'vlog_videos'
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = ((storage.foldername(name))[1])::uuid
        AND (t.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  );

CREATE POLICY "vlog_videos owner delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vlog_videos'
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = ((storage.foldername(name))[1])::uuid
        AND (t.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  );
