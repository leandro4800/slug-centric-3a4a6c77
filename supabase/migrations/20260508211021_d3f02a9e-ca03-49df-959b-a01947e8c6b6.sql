
-- 1) parceiros: restrict SELECT to authenticated (was public)
DROP POLICY IF EXISTS "Parceiros are viewable by everyone" ON public.parceiros;
CREATE POLICY "Parceiros viewable by authenticated"
ON public.parceiros
FOR SELECT
TO authenticated
USING (true);

-- 2) agendamentos_aula_avulsa: drop unsafe email-based JWT match.
-- Public booking flow uses token via edge function (service role); coach/admin/owner already have agend_owner_view.
DROP POLICY IF EXISTS "agendamentos_aula_avulsa_self_select" ON public.agendamentos_aula_avulsa;

-- 3) evolucao_metricas: add UPDATE/DELETE policies for owner + coach/admin
CREATE POLICY "metricas_update_own_or_coach"
ON public.evolucao_metricas
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM perfis p JOIN tenants t ON t.id = p.tenant_id
    WHERE p.id = evolucao_metricas.user_id
      AND (t.owner_user_id = auth.uid() OR has_role(auth.uid(), 'coach'::app_role, p.tenant_id))
  )
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM perfis p JOIN tenants t ON t.id = p.tenant_id
    WHERE p.id = evolucao_metricas.user_id
      AND (t.owner_user_id = auth.uid() OR has_role(auth.uid(), 'coach'::app_role, p.tenant_id))
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "metricas_delete_own_or_coach"
ON public.evolucao_metricas
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM perfis p JOIN tenants t ON t.id = p.tenant_id
    WHERE p.id = evolucao_metricas.user_id
      AND (t.owner_user_id = auth.uid() OR has_role(auth.uid(), 'coach'::app_role, p.tenant_id))
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 4) evolucao_fotos: add UPDATE policy for owner + coach/admin
CREATE POLICY "fotos_update_own_or_coach"
ON public.evolucao_fotos
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM perfis p JOIN tenants t ON t.id = p.tenant_id
    WHERE p.id = evolucao_fotos.user_id
      AND (t.owner_user_id = auth.uid() OR has_role(auth.uid(), 'coach'::app_role, p.tenant_id))
  )
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM perfis p JOIN tenants t ON t.id = p.tenant_id
    WHERE p.id = evolucao_fotos.user_id
      AND (t.owner_user_id = auth.uid() OR has_role(auth.uid(), 'coach'::app_role, p.tenant_id))
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);
