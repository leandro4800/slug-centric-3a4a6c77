
-- 1. Prevent students from self-updating their tenant_id
CREATE OR REPLACE FUNCTION public.enforce_perfis_tenant_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_staff :=
    public.has_role(v_uid, 'admin'::public.app_role)
    OR (OLD.tenant_id IS NOT NULL AND public.has_role(v_uid, 'coach'::public.app_role, OLD.tenant_id))
    OR (NEW.tenant_id IS NOT NULL AND public.has_role(v_uid, 'coach'::public.app_role, NEW.tenant_id))
    OR EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.owner_user_id = v_uid
        AND (t.id = OLD.tenant_id OR t.id = NEW.tenant_id)
    );

  IF NOT v_is_staff AND NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    NEW.tenant_id := OLD.tenant_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_perfis_tenant_lock_trg ON public.perfis;
CREATE TRIGGER enforce_perfis_tenant_lock_trg
BEFORE UPDATE ON public.perfis
FOR EACH ROW EXECUTE FUNCTION public.enforce_perfis_tenant_lock();

-- 2. Remove public exposure of slot details. Slots are only read via the
-- agendamento-aula edge function (service role).
DROP POLICY IF EXISTS slots_select_public ON public.agenda_aula_avulsa_slots;

-- 3. Harden agendamentos_aula_avulsa policies to require auth explicitly
DROP POLICY IF EXISTS agend_owner_view ON public.agendamentos_aula_avulsa;
CREATE POLICY agend_owner_view
ON public.agendamentos_aula_avulsa
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = agendamentos_aula_avulsa.tenant_id
        AND t.owner_user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS agend_owner_update ON public.agendamentos_aula_avulsa;
CREATE POLICY agend_owner_update
ON public.agendamentos_aula_avulsa
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = agendamentos_aula_avulsa.tenant_id
        AND t.owner_user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = agendamentos_aula_avulsa.tenant_id
        AND t.owner_user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);
