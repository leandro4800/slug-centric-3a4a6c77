-- 1) Coluna free_access nos tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS free_access boolean NOT NULL DEFAULT false;

-- 2) BadBoy Team: parceiro + free_access
UPDATE public.tenants
   SET is_partner = true, free_access = true, status = 'approved'
 WHERE slug = 'badboy-team';

-- 3) Criar tenants Coach Franco e Pedro Passos Team (se ainda não existirem)
INSERT INTO public.tenants (nome, slug, tagline, status, is_partner, free_access, primary_hsl, accent_hsl, vertical)
VALUES
  ('COACH FRANCO', 'coachfranco', 'TREINO & PERFORMANCE', 'approved', true, true, '357 92% 47%', '0 0% 100%', 'personal'),
  ('PEDRO PASSOS TEAM', 'pedropassosteam', 'HIPERTROFIA & CONDICIONAMENTO', 'approved', true, true, '357 92% 47%', '0 0% 100%', 'personal')
ON CONFLICT (slug) DO UPDATE
  SET status = 'approved',
      is_partner = true,
      free_access = true;

-- 4) Trigger que promove donos dos novos tenants quando os e-mails se cadastram
CREATE OR REPLACE FUNCTION public.auto_assign_partner_tenant_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_slug text;
  v_tenant_id uuid;
BEGIN
  v_slug := CASE lower(NEW.email)
    WHEN 'francolenine@bol.com.br' THEN 'coachfranco'
    WHEN 'pedropassos.he@gmail.com' THEN 'pedropassosteam'
    ELSE NULL
  END;

  IF v_slug IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = v_slug LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.tenants
     SET owner_user_id = NEW.id
   WHERE id = v_tenant_id AND (owner_user_id IS NULL OR owner_user_id = NEW.id);

  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (NEW.id, 'coach'::public.app_role, v_tenant_id)
  ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

  UPDATE public.perfis
     SET tenant_id = v_tenant_id, onboarding_completo = true
   WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_assign_partner_tenant_owner() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_auto_assign_partner_tenant_owner ON auth.users;
CREATE TRIGGER trg_auto_assign_partner_tenant_owner
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_partner_tenant_owner();

-- 5) Adiciona brennoalvezx@gmail.com à lista VIP do Alphateam
CREATE OR REPLACE FUNCTION public.auto_activate_vip_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_tenant_id UUID;
    v_plano_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    IF lower(NEW.email) IN (
        'alphacoachapp@gmail.com',
        'davidiasrodriguesbermudes@gmail.com',
        'executionmode48@gmail.com',
        '48mineiro@gmail.com',
        'marcus.alphateam@coach.app',
        'jonas.alphateam@coach.app',
        'execution.alphateam@coach.app',
        'samila.alphateam@coach.app',
        'lafietdesign@gmail.com',
        'brennoalvezx@gmail.com'
    ) THEN
        SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'alphateam' LIMIT 1;
        IF v_tenant_id IS NOT NULL THEN
            INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status, current_period_end)
            VALUES (NEW.id, v_tenant_id, v_plano_id, 'active', now() + interval '100 years')
            ON CONFLICT (aluno_id, tenant_id) DO UPDATE SET status = 'active';

            UPDATE public.perfis
               SET tenant_id = v_tenant_id, onboarding_completo = true
             WHERE id = NEW.id AND (tenant_id IS NULL OR tenant_id = v_tenant_id);

            INSERT INTO public.user_roles (user_id, role, tenant_id)
            VALUES (NEW.id, 'aluno'::public.app_role, v_tenant_id)
            ON CONFLICT (user_id, role, tenant_id) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.auto_activate_vip_subscription() FROM anon, authenticated, public;

-- 6) Se brennoalvezx já existir em auth.users, ativar retroativamente
DO $$
DECLARE v_uid uuid; v_tenant uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'brennoalvezx@gmail.com' LIMIT 1;
  SELECT id INTO v_tenant FROM public.tenants WHERE slug = 'alphateam' LIMIT 1;
  IF v_uid IS NOT NULL AND v_tenant IS NOT NULL THEN
    INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status, current_period_end)
    VALUES (v_uid, v_tenant, '11111111-1111-1111-1111-111111111111', 'active', now() + interval '100 years')
    ON CONFLICT (aluno_id, tenant_id) DO UPDATE SET status = 'active';
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (v_uid, 'aluno'::public.app_role, v_tenant)
    ON CONFLICT (user_id, role, tenant_id) DO NOTHING;
    UPDATE public.perfis SET tenant_id = v_tenant, onboarding_completo = true WHERE id = v_uid;
  END IF;
END $$;