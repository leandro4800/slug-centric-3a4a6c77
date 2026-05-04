DO $$
DECLARE
  v_samila_user_id uuid;
  v_samila_tenant_id uuid;
BEGIN
  SELECT p.id INTO v_samila_user_id
  FROM public.perfis p
  WHERE lower(p.email) = 'samilaaraujodias@gmail.com'
  LIMIT 1;

  SELECT t.id INTO v_samila_tenant_id
  FROM public.tenants t
  WHERE t.slug = 'nutrisamiladias'
  LIMIT 1;

  IF v_samila_user_id IS NOT NULL AND v_samila_tenant_id IS NOT NULL THEN
    UPDATE public.tenants
    SET owner_user_id = v_samila_user_id,
        status = 'approved'::public.tenant_status
    WHERE id = v_samila_tenant_id;

    UPDATE public.perfis
    SET tenant_id = v_samila_tenant_id,
        onboarding_completo = true
    WHERE id = v_samila_user_id;

    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (v_samila_user_id, 'coach'::public.app_role, v_samila_tenant_id)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.user_roles (user_id, role, tenant_id)
  SELECT t.owner_user_id, 'coach'::public.app_role, t.id
  FROM public.tenants t
  WHERE t.status = 'approved'::public.tenant_status
    AND t.owner_user_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  UPDATE public.perfis p
  SET tenant_id = t.id,
      onboarding_completo = true
  FROM public.tenants t
  WHERE t.owner_user_id = p.id
    AND t.status = 'approved'::public.tenant_status;
END $$;

CREATE OR REPLACE FUNCTION public.sync_approved_tenant_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved'::public.tenant_status AND NEW.owner_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (NEW.owner_user_id, 'coach'::public.app_role, NEW.id)
    ON CONFLICT DO NOTHING;

    UPDATE public.perfis
    SET tenant_id = NEW.id,
        onboarding_completo = true
    WHERE id = NEW.owner_user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_approved_tenant_owner_on_tenants ON public.tenants;
CREATE TRIGGER sync_approved_tenant_owner_on_tenants
AFTER INSERT OR UPDATE OF status, owner_user_id ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.sync_approved_tenant_owner();