-- Fix records for existing VIP users
DO $$
DECLARE
    r RECORD;
    v_tenant_id UUID;
    v_exists BOOLEAN;
BEGIN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'alphateam' LIMIT 1;
    
    IF v_tenant_id IS NOT NULL THEN
        FOR r IN 
            SELECT id FROM public.perfis 
            WHERE lower(email) IN (
                'alphacoachapp@gmail.com',
                'davidiasrodriguesbermudes@gmail.com',
                'executionmode48@gmail.com',
                'marcus.alphateam@coach.app',
                'jonas.alphateam@coach.app',
                'execution.alphateam@coach.app',
                'samila.alphateam@coach.app'
            )
        LOOP
            -- Update profile
            UPDATE public.perfis 
            SET onboarding_completo = true,
                tenant_id = v_tenant_id
            WHERE id = r.id;

            -- Create anamnese
            INSERT INTO public.anamnese_aluno (aluno_id, tenant_id, doencas, qualidade_sono, nivel_estresse)
            VALUES (r.id, v_tenant_id, '{}', 8, 5)
            ON CONFLICT (aluno_id) DO UPDATE SET tenant_id = v_tenant_id;

            -- Create evaluation if none exists
            SELECT EXISTS(SELECT 1 FROM public.avaliacoes_fisicas WHERE aluno_id = r.id) INTO v_exists;
            IF NOT v_exists THEN
                INSERT INTO public.avaliacoes_fisicas (aluno_id, tenant_id, peso_kg, altura_cm)
                VALUES (r.id, v_tenant_id, 75, 175);
            END IF;
        END LOOP;
    END IF;
END $$;