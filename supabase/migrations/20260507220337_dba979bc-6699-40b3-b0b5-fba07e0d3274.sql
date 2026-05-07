-- Recria a função de vínculo do dono do tenant de forma segura para INSERT e UPDATE
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
    WHERE id = NEW.owner_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Recria a função de aprovação para reforçar o vínculo quando o tenant for aprovado
CREATE OR REPLACE FUNCTION public.sync_approved_tenant_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved'::public.tenant_status AND NEW.owner_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (NEW.owner_user_id, 'coach'::public.app_role, NEW.id)
    ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

    UPDATE public.perfis
    SET tenant_id = NEW.id,
        onboarding_completo = true
    WHERE id = NEW.owner_user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_tenant_owner_coach_role ON public.tenants;
CREATE TRIGGER trg_ensure_tenant_owner_coach_role
AFTER INSERT OR UPDATE OF owner_user_id ON public.tenants
FOR EACH ROW
WHEN (NEW.owner_user_id IS NOT NULL)
EXECUTE FUNCTION public.ensure_tenant_owner_coach_role();

DROP TRIGGER IF EXISTS trg_sync_approved_tenant_owner ON public.tenants;
CREATE TRIGGER trg_sync_approved_tenant_owner
AFTER INSERT OR UPDATE OF status, owner_user_id ON public.tenants
FOR EACH ROW
WHEN (NEW.status = 'approved'::public.tenant_status AND NEW.owner_user_id IS NOT NULL)
EXECUTE FUNCTION public.sync_approved_tenant_owner();

-- Corrige tenants existentes que tinham dono mas não estavam vinculados ao perfil/role
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT t.owner_user_id, 'coach'::public.app_role, t.id
FROM public.tenants t
WHERE t.owner_user_id IS NOT NULL
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

UPDATE public.perfis p
SET tenant_id = t.id,
    onboarding_completo = true
FROM public.tenants t
WHERE p.id = t.owner_user_id
  AND t.owner_user_id IS NOT NULL
  AND p.tenant_id IS DISTINCT FROM t.id;

-- Trava títulos de vlogs no banco para todos os tenants, atuais e futuros
CREATE OR REPLACE FUNCTION public.force_vlog_post_title_null()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.title := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_vlog_post_title_null ON public.vlog_posts;
CREATE TRIGGER trg_force_vlog_post_title_null
BEFORE INSERT OR UPDATE OF title ON public.vlog_posts
FOR EACH ROW
EXECUTE FUNCTION public.force_vlog_post_title_null();

UPDATE public.vlog_posts
SET title = NULL
WHERE title IS NOT NULL;