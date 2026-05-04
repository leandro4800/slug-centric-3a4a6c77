
-- 1) Revoke sensitive column access on public.tenants from anon/authenticated
REVOKE SELECT (vlog_webhook_secret, stripe_account_id, stripe_onboarding_completed) ON public.tenants FROM anon, authenticated;

-- 2) Tenant-scope community SELECT policies
DROP POLICY IF EXISTS "Ver posts do time" ON public.comunidade_posts;
CREATE POLICY "Ver posts do time" ON public.comunidade_posts
FOR SELECT TO authenticated
USING (
  profissional_id = auth.uid()
  OR usuario_id = auth.uid()
  OR profissional_id IN (
    SELECT t.owner_user_id FROM public.tenants t
    WHERE t.id = public.current_user_tenant()
  )
);

DROP POLICY IF EXISTS "Ver comentarios" ON public.comunidade_comentarios;
CREATE POLICY "Ver comentarios" ON public.comunidade_comentarios
FOR SELECT TO authenticated
USING (
  usuario_id = auth.uid()
  OR profissional_id = auth.uid()
  OR profissional_id IN (
    SELECT t.owner_user_id FROM public.tenants t
    WHERE t.id = public.current_user_tenant()
  )
);

DROP POLICY IF EXISTS "Ver curtidas" ON public.comunidade_curtidas;
CREATE POLICY "Ver curtidas" ON public.comunidade_curtidas
FOR SELECT TO authenticated
USING (
  usuario_id = auth.uid()
  OR profissional_id = auth.uid()
  OR profissional_id IN (
    SELECT t.owner_user_id FROM public.tenants t
    WHERE t.id = public.current_user_tenant()
  )
);

-- 3) Add UPDATE policy for comunidade_uploads bucket (only uploader can overwrite)
CREATE POLICY "comunidade_uploads_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'comunidade_uploads' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'comunidade_uploads' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 4) Allow admins to read identity verification documents
CREATE POLICY "Admins can view identity documents" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'identidades' AND public.has_role(auth.uid(), 'admin'::public.app_role));
