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
        'lafietdesign@gmail.com'
    ) THEN
        SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'alphateam' LIMIT 1;
        IF v_tenant_id IS NOT NULL THEN
            INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status, current_period_end)
            VALUES (NEW.id, v_tenant_id, v_plano_id, 'active', now() + interval '100 years')
            ON CONFLICT (aluno_id, tenant_id) DO UPDATE SET status = 'active';
            IF NEW.tenant_id IS NULL THEN
                UPDATE public.perfis SET tenant_id = v_tenant_id, onboarding_completo = true WHERE id = NEW.id;
            END IF;
            INSERT INTO public.user_roles (user_id, role, tenant_id)
            VALUES (NEW.id, 'aluno'::public.app_role, v_tenant_id)
            ON CONFLICT (user_id, role, tenant_id) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;