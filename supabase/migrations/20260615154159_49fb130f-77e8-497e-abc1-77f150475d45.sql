
-- Add tenant scoping to technical videos library
ALTER TABLE public.referencia_exercicios
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'youtube';

CREATE INDEX IF NOT EXISTS idx_referencia_exercicios_tenant ON public.referencia_exercicios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_referencia_exercicios_nome ON public.referencia_exercicios(lower(nome_exercicio));

-- Replace SELECT policy: globals (tenant_id IS NULL) visible to all authenticated; tenant rows only to tenant members or admin
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.referencia_exercicios;
CREATE POLICY "ref_exercicios_select"
  ON public.referencia_exercicios FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NULL
    OR has_role(auth.uid(), 'admin'::app_role)
    OR public.user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- Coach can insert rows scoped to a tenant they coach
DROP POLICY IF EXISTS ref_exercicios_coach_insert ON public.referencia_exercicios;
CREATE POLICY ref_exercicios_coach_insert
  ON public.referencia_exercicios FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      tenant_id IS NOT NULL
      AND has_role(auth.uid(), 'coach'::app_role, tenant_id)
      AND profissional_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ref_exercicios_coach_update ON public.referencia_exercicios;
CREATE POLICY ref_exercicios_coach_update
  ON public.referencia_exercicios FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (tenant_id IS NOT NULL AND has_role(auth.uid(), 'coach'::app_role, tenant_id))
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (tenant_id IS NOT NULL AND has_role(auth.uid(), 'coach'::app_role, tenant_id))
  );

DROP POLICY IF EXISTS ref_exercicios_coach_delete ON public.referencia_exercicios;
CREATE POLICY ref_exercicios_coach_delete
  ON public.referencia_exercicios FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (tenant_id IS NOT NULL AND has_role(auth.uid(), 'coach'::app_role, tenant_id))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referencia_exercicios TO authenticated;
GRANT ALL ON public.referencia_exercicios TO service_role;
