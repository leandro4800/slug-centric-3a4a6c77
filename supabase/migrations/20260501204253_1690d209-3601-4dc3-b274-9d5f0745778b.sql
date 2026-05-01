-- 1. Defina o ID do Alpha Coach e do Plano Alpha Elite
DO $$
DECLARE
    v_tenant_id UUID := '6c4ff89c-3d9f-4225-ae95-5bf1dbf35886';
    v_plan_id UUID;
BEGIN
    -- Pegar o plano Alpha Elite
    SELECT id INTO v_plan_id FROM public.planos 
    WHERE tenant_id = v_tenant_id AND nome ILIKE '%Alpha Elite%'
    LIMIT 1;

    -- 2. Vincular usuários que estão sem tenant_id ao Alpha Coach (alphateam)
    -- Isso garante que eles passem no SubscriptionGuard e BrandingProvider
    UPDATE public.perfis
    SET tenant_id = v_tenant_id
    WHERE tenant_id IS NULL;

    -- 3. Criar ou ativar assinaturas para TODOS os usuários vinculados ao Alpha Coach
    -- Isso resolve o problema de acesso imediato
    INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status)
    SELECT id, v_tenant_id, v_plan_id, 'active'
    FROM public.perfis
    WHERE tenant_id = v_tenant_id
    ON CONFLICT (aluno_id, tenant_id) DO UPDATE SET status = 'active';

END $$;

-- 4. Melhorar o trigger para garantir que novos usuários SEMPRE tenham um tenant e plano se forem do Alpha Coach
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_id UUID;
    v_tenant_id UUID := '6c4ff89c-3d9f-4225-ae95-5bf1dbf35886'; -- Alpha Coach
BEGIN
    -- Se o tenant_id vier nulo, assumimos Alpha Coach por padrão para este ambiente
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := v_tenant_id;
    END IF;

    -- Obter o ID do plano
    SELECT id INTO v_plan_id FROM public.planos 
    WHERE tenant_id = v_tenant_id AND nome ILIKE '%Alpha Elite%'
    LIMIT 1;

    -- Criar assinatura ativa automática se for Alpha Coach
    IF NEW.tenant_id = v_tenant_id AND v_plan_id IS NOT NULL THEN
        INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status)
        VALUES (NEW.id, v_tenant_id, v_plan_id, 'active')
        ON CONFLICT (aluno_id, tenant_id) DO UPDATE SET status = 'active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Garantir que o trigger dispare ANTES do insert para poder setar o tenant_id default
DROP TRIGGER IF EXISTS trg_auto_subscribe_alpha ON public.perfis;
CREATE TRIGGER trg_auto_subscribe_alpha
BEFORE INSERT OR UPDATE OF tenant_id ON public.perfis
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();