
-- 1. Tighten quiz INSERT policy
DROP POLICY IF EXISTS anyone_insert_quiz ON public.coach_qualification_leads;
CREATE POLICY anyone_insert_quiz ON public.coach_qualification_leads
  FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 2. Fix function search_path
CREATE OR REPLACE FUNCTION public.update_slot_reservados_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.agenda_presencial_slots
        SET reservados = reservados + 1
        WHERE id = NEW.slot_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.agenda_presencial_slots
        SET reservados = GREATEST(0, reservados - 1)
        WHERE id = OLD.slot_id;
    END IF;
    RETURN NULL;
END;
$function$;

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
        'samila.alphateam@coach.app'
    ) THEN
        SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'alphateam' LIMIT 1;
        IF v_tenant_id IS NOT NULL THEN
            INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status, current_period_end)
            VALUES (NEW.id, v_tenant_id, v_plano_id, 'active', now() + interval '100 years')
            ON CONFLICT (aluno_id, tenant_id) DO UPDATE SET status = 'active';
            IF NEW.tenant_id IS NULL THEN
                UPDATE public.perfis SET tenant_id = v_tenant_id, onboarding_completo = true WHERE id = NEW.id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

-- 3. Restrict push_token column access in perfis
REVOKE SELECT (push_token) ON public.perfis FROM authenticated;
REVOKE SELECT (push_token) ON public.perfis FROM anon;
-- service_role keeps access (bypasses these grants anyway)

-- 4. Restrict stripe_* columns from anon on planos
REVOKE SELECT (stripe_price_id, stripe_product_id) ON public.planos FROM anon;
