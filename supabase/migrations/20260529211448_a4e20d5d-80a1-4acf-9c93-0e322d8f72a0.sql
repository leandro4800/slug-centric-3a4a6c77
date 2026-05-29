
-- 1) Quiz leads
CREATE TABLE public.coach_qualification_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  email TEXT NULL,
  profissao TEXT NULL,
  profissao_outro TEXT NULL,
  alunos_atuais TEXT NULL,
  faturamento_mensal TEXT NULL,
  plano_recomendado TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.coach_qualification_leads TO anon;
GRANT SELECT, INSERT, UPDATE ON public.coach_qualification_leads TO authenticated;
GRANT ALL ON public.coach_qualification_leads TO service_role;

ALTER TABLE public.coach_qualification_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_insert_quiz" ON public.coach_qualification_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "owner_select_quiz" ON public.coach_qualification_leads
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin_all_quiz" ON public.coach_qualification_leads
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Plataform subscription (coach -> Alpha Coach)
CREATE TYPE public.coach_plan_tier AS ENUM ('standard','premium','pro');
CREATE TYPE public.coach_sub_status AS ENUM ('pending','trialing','active','past_due','canceled');

CREATE TABLE public.coach_platform_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  tenant_id UUID NULL,
  plan_tier public.coach_plan_tier NOT NULL,
  status public.coach_sub_status NOT NULL DEFAULT 'pending',
  fee_pct NUMERIC(5,2) NOT NULL DEFAULT 7.99,
  asaas_customer_id TEXT NULL,
  asaas_subscription_id TEXT NULL,
  first_payment_value NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  full_price NUMERIC(10,2) NOT NULL,
  current_period_end TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.coach_platform_subscriptions TO authenticated;
GRANT ALL ON public.coach_platform_subscriptions TO service_role;

ALTER TABLE public.coach_platform_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_select_own_platform_sub" ON public.coach_platform_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "coach_upsert_own_platform_sub" ON public.coach_platform_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "coach_update_own_platform_sub" ON public.coach_platform_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_coach_platform_subs_updated_at
  BEFORE UPDATE ON public.coach_platform_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Dashboard KPI view (per tenant of caller)
CREATE OR REPLACE VIEW public.v_coach_dashboard_kpis
WITH (security_invoker = true) AS
SELECT
  t.id AS tenant_id,
  t.slug,
  (SELECT count(*) FROM public.assinaturas a WHERE a.tenant_id = t.id AND a.status IN ('active','trialing')) AS alunos_ativos,
  (SELECT count(*) FROM public.assinaturas a WHERE a.tenant_id = t.id AND a.status IN ('canceled','past_due')) AS alunos_inativos,
  COALESCE((
    SELECT sum(p.preco_centavos)/100.0 * (1 - 0.0799)
    FROM public.assinaturas a
    JOIN public.planos p ON p.id = a.plano_id
    WHERE a.tenant_id = t.id
      AND a.status IN ('active','trialing')
      AND date_trunc('month', a.updated_at) = date_trunc('month', now())
  ), 0)::NUMERIC(12,2) AS faturamento_mes_liquido,
  (
    SELECT min(a.current_period_end)
    FROM public.assinaturas a
    WHERE a.tenant_id = t.id
      AND a.status IN ('active','trialing')
      AND a.current_period_end > now()
  ) AS proximo_pagamento
FROM public.tenants t
WHERE t.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role);

GRANT SELECT ON public.v_coach_dashboard_kpis TO authenticated;
