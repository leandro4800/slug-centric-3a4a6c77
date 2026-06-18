
-- 1) Tenants: prevent anonymous enumeration of owner_user_id
REVOKE SELECT (owner_user_id) ON public.tenants FROM anon;

-- 2) Agendamentos: bearer token and stripe session id must not be readable via Data API
REVOKE SELECT (token, stripe_session_id) ON public.agendamentos_aula_avulsa FROM anon;
REVOKE SELECT (token, stripe_session_id) ON public.agendamentos_aula_avulsa FROM authenticated;

-- 3) Alunos: allow tenant owner to view all students in their tenant
DROP POLICY IF EXISTS "Tenant owners can view their tenant alunos" ON public.alunos;
CREATE POLICY "Tenant owners can view their tenant alunos"
  ON public.alunos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = alunos.tenant_id AND t.owner_user_id = auth.uid()
    )
  );
