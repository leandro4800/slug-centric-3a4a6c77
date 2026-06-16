
-- 1) PERFIS: restringir SELECT — alunos só leem o próprio perfil; coaches/owners/admins leem do tenant
DROP POLICY IF EXISTS "perfis_select_all_in_tenant" ON public.perfis;

CREATE POLICY "perfis_select_own_or_staff"
ON public.perfis
FOR SELECT
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (tenant_id IS NOT NULL AND public.has_role(auth.uid(), 'coach'::public.app_role, tenant_id))
  OR (tenant_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = perfis.tenant_id AND t.owner_user_id = auth.uid()
      ))
);

-- 2) COMUNIDADE_POSTS: limitar leitura ao próprio tenant
DROP POLICY IF EXISTS "Ver todos os posts da comunidade" ON public.comunidade_posts;

CREATE POLICY "Ver posts do proprio tenant"
ON public.comunidade_posts
FOR SELECT
TO authenticated
USING (
  profissional_id = public.get_user_tenant_id(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'coach'::public.app_role, profissional_id)
  OR EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = comunidade_posts.profissional_id AND t.owner_user_id = auth.uid()
  )
);

-- 3) COMUNIDADE_COMENTARIOS: idem
DROP POLICY IF EXISTS "Ver comentarios auth" ON public.comunidade_comentarios;

CREATE POLICY "Ver comentarios do proprio tenant"
ON public.comunidade_comentarios
FOR SELECT
TO authenticated
USING (
  profissional_id = public.get_user_tenant_id(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'coach'::public.app_role, profissional_id)
  OR EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = comunidade_comentarios.profissional_id AND t.owner_user_id = auth.uid()
  )
);

-- 4) COMUNIDADE_CURTIDAS: idem
DROP POLICY IF EXISTS "Ver curtidas auth" ON public.comunidade_curtidas;

CREATE POLICY "Ver curtidas do proprio tenant"
ON public.comunidade_curtidas
FOR SELECT
TO authenticated
USING (
  profissional_id = public.get_user_tenant_id(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'coach'::public.app_role, profissional_id)
  OR EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = comunidade_curtidas.profissional_id AND t.owner_user_id = auth.uid()
  )
);
