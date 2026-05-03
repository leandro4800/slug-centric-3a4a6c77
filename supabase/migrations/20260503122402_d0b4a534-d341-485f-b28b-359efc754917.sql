
-- 1. Fix has_role: NULL tenant_id only valid for admin role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role, _tenant_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (
        -- Global admin: NULL tenant_id is only honored for the admin role
        (tenant_id IS NULL AND role = 'admin'::app_role)
        OR (_tenant_id IS NOT NULL AND tenant_id = _tenant_id)
      )
  );
$function$;

-- 2. Enforce at table level: NULL tenant_id only allowed for admin
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_null_tenant_admin_only;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_null_tenant_admin_only
  CHECK (tenant_id IS NOT NULL OR role = 'admin'::app_role);

-- 3. Community: require authentication for SELECT
DROP POLICY IF EXISTS "Ver posts do time" ON public.comunidade_posts;
CREATE POLICY "Ver posts do time" ON public.comunidade_posts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Ver comentarios" ON public.comunidade_comentarios;
CREATE POLICY "Ver comentarios" ON public.comunidade_comentarios
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Ver curtidas" ON public.comunidade_curtidas;
CREATE POLICY "Ver curtidas" ON public.comunidade_curtidas
  FOR SELECT TO authenticated USING (true);

-- 4. Alunos: scope coach to same tenant
DROP POLICY IF EXISTS "Profissionais can view their alunos" ON public.alunos;
CREATE POLICY "Profissionais can view their alunos" ON public.alunos
  FOR SELECT TO authenticated
  USING (
    auth.uid() = profissional_id
    AND (
      has_role(auth.uid(), 'coach'::app_role, tenant_id)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- 5. configuracoes_tenant: restrict to authenticated
DROP POLICY IF EXISTS "cfg_select_tenant" ON public.configuracoes_tenant;
CREATE POLICY "cfg_select_tenant" ON public.configuracoes_tenant
  FOR SELECT TO authenticated
  USING (
    (tenant_id = current_user_tenant())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "cfg_manage_coach" ON public.configuracoes_tenant;
CREATE POLICY "cfg_manage_coach" ON public.configuracoes_tenant
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'coach'::app_role, tenant_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coach'::app_role, tenant_id) OR has_role(auth.uid(), 'admin'::app_role));

-- 6. Tenants: revoke sensitive columns from anon/authenticated
REVOKE SELECT (stripe_account_id, vlog_webhook_secret, stripe_onboarding_completed)
  ON public.tenants FROM anon, authenticated;

-- 7. Saques: add admin UPDATE/DELETE policies
DROP POLICY IF EXISTS "Admins can update saques" ON public.saques;
CREATE POLICY "Admins can update saques" ON public.saques
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete saques" ON public.saques;
CREATE POLICY "Admins can delete saques" ON public.saques
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. Tighten SECURITY DEFINER function: revoke broad EXECUTE on buscar_templates_treino
REVOKE EXECUTE ON FUNCTION public.buscar_templates_treino(text, text, integer, text, text, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buscar_templates_treino(text, text, integer, text, text, uuid, integer) TO authenticated;
