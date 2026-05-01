-- 1. Garantir que a tabela alunos tenha os registros necessários
INSERT INTO public.alunos (id, nome, tenant_id)
SELECT id, nome_completo, tenant_id
FROM public.perfis
ON CONFLICT (id) DO NOTHING;

-- 2. Garantir que a tabela perfis_treino tenha os registros necessários
INSERT INTO public.perfis_treino (aluno_id, tenant_id, sexo, peso_kg, altura_cm)
SELECT id, tenant_id, sexo, 0, 0
FROM public.perfis
ON CONFLICT (aluno_id) DO NOTHING;

-- 3. Atualizar função de trigger para ser mais completa
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_plan_id UUID;
    v_tenant_id UUID := '6c4ff89c-3d9f-4225-ae95-5bf1dbf35886'; -- Alpha Coach
BEGIN
    -- Se o tenant_id vier nulo, assumimos Alpha Coach por padrão
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := v_tenant_id;
    END IF;

    -- 1. Inserir em alunos para compatibilidade
    INSERT INTO public.alunos (id, nome, tenant_id)
    VALUES (NEW.id, NEW.nome_completo, NEW.tenant_id)
    ON CONFLICT (id) DO UPDATE SET 
        nome = EXCLUDED.nome,
        tenant_id = EXCLUDED.tenant_id;

    -- 2. Inserir em perfis_treino para compatibilidade
    INSERT INTO public.perfis_treino (aluno_id, tenant_id, sexo)
    VALUES (NEW.id, NEW.tenant_id, NEW.sexo)
    ON CONFLICT (aluno_id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        sexo = EXCLUDED.sexo;

    -- 3. Obter o ID do plano Alpha Elite
    SELECT id INTO v_plan_id FROM public.planos 
    WHERE tenant_id = v_tenant_id AND nome ILIKE '%Alpha Elite%'
    LIMIT 1;

    -- 4. Criar assinatura ativa automática
    IF NEW.tenant_id = v_tenant_id AND v_plan_id IS NOT NULL THEN
        INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status)
        VALUES (NEW.id, v_tenant_id, v_plan_id, 'active')
        ON CONFLICT (aluno_id, tenant_id) DO UPDATE SET status = 'active';
    END IF;

    RETURN NEW;
END;
$function$;

-- 4. Resetar onboarding para o usuário Marcus L para forçar preenchimento correto
UPDATE public.perfis 
SET onboarding_completo = false 
WHERE email = 'executionmode48@gmail.com';

-- 5. Remover registros possivelmente incompletos para forçar o fluxo de onboarding
DELETE FROM public.anamnese_aluno WHERE aluno_id = '05633fe1-dd74-4c0e-8d28-7405cc6cf3b4';
DELETE FROM public.avaliacoes_fisicas WHERE aluno_id = '05633fe1-dd74-4c0e-8d28-7405cc6cf3b4';
