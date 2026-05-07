-- Corrige policies de planos para evitar execução de has_role em contexto anônimo
-- O erro atual é: permission denied for function has_role
-- Isso ocorre porque policies marcadas como public chamam has_role mesmo para visitantes.

DROP POLICY IF EXISTS planos_select_public ON public.planos;
DROP POLICY IF EXISTS planos_manage_owner ON public.planos;

-- Visitantes e usuários autenticados podem ver somente planos ativos
-- de tenants aprovados. Esta policy não chama funções restritas.
CREATE POLICY planos_public_active_approved_select
ON public.planos
FOR SELECT
TO anon, authenticated
USING (
  ativo = true
  AND EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = planos.tenant_id
      AND t.status = 'approved'::public.tenant_status
  )
);

-- Dono do tenant e administradores autenticados podem ver todos os planos,
-- inclusive inativos, para gestão no painel.
CREATE POLICY planos_owner_admin_select
ON public.planos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = planos.tenant_id
      AND t.owner_user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Dono do tenant e administradores autenticados podem criar planos.
CREATE POLICY planos_owner_admin_insert
ON public.planos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = planos.tenant_id
      AND t.owner_user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Dono do tenant e administradores autenticados podem editar planos.
CREATE POLICY planos_owner_admin_update
ON public.planos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = planos.tenant_id
      AND t.owner_user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = planos.tenant_id
      AND t.owner_user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Dono do tenant e administradores autenticados podem excluir apenas quando
-- o trigger do banco permitir (sem assinaturas ativas vinculadas).
CREATE POLICY planos_owner_admin_delete
ON public.planos
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = planos.tenant_id
      AND t.owner_user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Garante que usuários autenticados possam avaliar as policies administrativas.
-- Não concede execução para visitantes anônimos.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role, uuid) TO authenticated;