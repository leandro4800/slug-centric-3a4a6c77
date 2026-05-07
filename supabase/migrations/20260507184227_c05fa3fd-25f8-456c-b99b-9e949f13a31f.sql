-- Backfill: ensure every tenant owner has coach role for their tenant
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT t.owner_user_id, 'coach'::public.app_role, t.id
FROM public.tenants t
WHERE t.owner_user_id IS NOT NULL
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Keep tenant owner roles in sync when tenants are created or owner changes
CREATE OR REPLACE FUNCTION public.ensure_tenant_owner_coach_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.owner_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (NEW.owner_user_id, 'coach'::public.app_role, NEW.id)
    ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

    UPDATE public.perfis
    SET tenant_id = NEW.id,
        onboarding_completo = true
    WHERE id = NEW.owner_user_id
      AND (tenant_id IS NULL OR tenant_id = OLD.id OR id = NEW.owner_user_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_tenant_owner_coach_role_trigger ON public.tenants;
CREATE TRIGGER ensure_tenant_owner_coach_role_trigger
AFTER INSERT OR UPDATE OF owner_user_id ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.ensure_tenant_owner_coach_role();