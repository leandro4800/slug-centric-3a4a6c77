
-- 1) Revoga colunas sensíveis em public.tenants do anon/authenticated
REVOKE SELECT (vlog_webhook_secret, stripe_account_id, stripe_onboarding_completed)
  ON public.tenants FROM anon, authenticated;

-- 2) Política para coaches/admins visualizarem profissionais do mesmo tenant
DROP POLICY IF EXISTS "profissionais_select_staff" ON public.profissionais;
CREATE POLICY "profissionais_select_staff" ON public.profissionais
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      tenant_id IS NOT NULL
      AND public.has_role(auth.uid(), 'coach'::public.app_role, tenant_id)
    )
  );

-- 3) Remover listagem pública ampla do bucket vlog_videos
DROP POLICY IF EXISTS "vlog_videos public read" ON storage.objects;

-- 4) Revogar EXECUTE de funções SECURITY DEFINER internas (triggers/handlers)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_perfil_treino_from_avaliacao() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_tenants_to_private() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_private_to_tenants() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_approved_tenant_owner() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.auto_activate_vip_subscription() FROM anon, authenticated, public;
