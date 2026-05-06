
-- 1. Atualiza plano da Samila com Stripe IDs
UPDATE public.planos
SET stripe_product_id = 'prod_UT02JajEmvoG6b',
    stripe_price_id = 'price_1TU42i5cCGgymbBEdsUUhHg8'
WHERE id = '20d5e680-e315-44a0-a2dc-a78408230cbf';

-- 2. Tabela aulas_avulsas
CREATE TABLE IF NOT EXISTS public.aulas_avulsas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  aluno_id UUID,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  valor_centavos INTEGER NOT NULL,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.aulas_avulsas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_view_aulas_avulsas"
ON public.aulas_avulsas FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = aulas_avulsas.tenant_id AND t.owner_user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (aluno_id IS NOT NULL AND aluno_id = auth.uid())
);

CREATE INDEX idx_aulas_avulsas_tenant ON public.aulas_avulsas(tenant_id, created_at DESC);

-- 3. Remover trigger problemático que dava acesso grátis automático
DROP TRIGGER IF EXISTS trg_auto_activate_vip ON auth.users;
DROP TRIGGER IF EXISTS auto_activate_vip ON auth.users;

-- Recriar a função restringida apenas aos emails VIP explicitamente listados
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
            UPDATE public.perfis SET tenant_id = v_tenant_id, onboarding_completo = true WHERE id = NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_auto_activate_vip
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_activate_vip_subscription();

-- 4. Corrigir handle_new_user_subscription: NÃO criar assinatura ativa automática
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Apenas garante alunos/perfis_treino — NÃO cria mais assinatura active automática
    IF NEW.tenant_id IS NOT NULL THEN
        INSERT INTO public.alunos (id, nome, tenant_id)
        VALUES (NEW.id, NEW.nome_completo, NEW.tenant_id)
        ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, tenant_id = EXCLUDED.tenant_id;
        INSERT INTO public.perfis_treino (aluno_id, tenant_id, sexo)
        VALUES (NEW.id, NEW.tenant_id, NEW.sexo)
        ON CONFLICT (aluno_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, sexo = EXCLUDED.sexo;
    END IF;
    RETURN NEW;
END;
$function$;
