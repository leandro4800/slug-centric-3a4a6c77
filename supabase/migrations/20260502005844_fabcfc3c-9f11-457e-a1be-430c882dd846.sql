CREATE OR REPLACE FUNCTION public.auto_activate_vip_subscription()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_plano_id UUID := '11111111-1111-1111-1111-111111111111'; -- Plano Alpha Elite (mock)
BEGIN
    -- Lista de emails VIP (agora em lowercase para comparação)
    IF lower(NEW.email) IN (
        'alphacoachapp@gmail.com',
        'davidiasrodriguesbermudes@gmail.com',
        'executionmode48@gmail.com',
        'marcus.alphateam@coach.app',
        'jonas.alphateam@coach.app',
        'execution.alphateam@coach.app',
        'samila.alphateam@coach.app'
    ) THEN
        -- Tenta pegar o tenant 'alphateam'
        SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'alphateam' LIMIT 1;
        
        IF v_tenant_id IS NOT NULL THEN
            -- Insere a assinatura se não existir
            INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status, current_period_end)
            VALUES (NEW.id, v_tenant_id, v_plano_id, 'active', now() + interval '100 years')
            ON CONFLICT (aluno_id, tenant_id) DO UPDATE SET status = 'active';
            
            -- Também vincula o perfil ao tenant e marca como completo
            UPDATE public.perfis 
            SET tenant_id = v_tenant_id, 
                onboarding_completo = true 
            WHERE id = NEW.id;

            -- Cria registros de anamnese e avaliação fake para passar nos guards
            INSERT INTO public.anamnese_aluno (aluno_id, tenant_id, doencas, qualidade_sono, nivel_estresse)
            VALUES (NEW.id, v_tenant_id, '{}', 8, 5)
            ON CONFLICT (aluno_id) DO NOTHING;

            INSERT INTO public.avaliacoes_fisicas (aluno_id, tenant_id, peso_kg, altura_cm)
            VALUES (NEW.id, v_tenant_id, 75, 175)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;