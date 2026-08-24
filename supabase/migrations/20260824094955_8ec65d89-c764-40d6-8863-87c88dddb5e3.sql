-- Helper SECURITY DEFINER para ler o tenant atualmente gravado de um perfil
-- sem recursão de RLS (usado nos WITH CHECK abaixo).
CREATE OR REPLACE FUNCTION public.perfis_stored_tenant(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.perfis WHERE id = _user_id
$$;

REVOKE ALL ON FUNCTION public.perfis_stored_tenant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.perfis_stored_tenant(uuid) TO authenticated, service_role;

-- perfis: usuário comum não pode trocar o próprio tenant_id (defesa em
-- profundidade junto ao trigger enforce_perfis_tenant_lock).
DROP POLICY IF EXISTS "perfis_update_own_or_staff" ON public.perfis;
CREATE POLICY "perfis_update_own_or_staff"
ON public.perfis FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'coach'::public.app_role, tenant_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'coach'::public.app_role, tenant_id)
  OR EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.owner_user_id = auth.uid()
      AND t.id = perfis.tenant_id
  )
  OR (
    auth.uid() = id
    AND tenant_id IS NOT DISTINCT FROM public.perfis_stored_tenant(auth.uid())
  )
);

-- perfis_treino: aluno não pode mover seu perfil de treino para outro tenant.
DROP POLICY IF EXISTS "pt_aluno_update_own" ON public.perfis_treino;
CREATE POLICY "pt_aluno_update_own" ON public.perfis_treino FOR UPDATE
TO authenticated
USING (aluno_id = auth.uid())
WITH CHECK (
  aluno_id = auth.uid()
  AND tenant_id IS NOT DISTINCT FROM public.perfis_stored_tenant(auth.uid())
);