
ALTER FUNCTION public.check_and_send_reminders() SET search_path = public;

ALTER TABLE public.tenants_private ADD COLUMN IF NOT EXISTS asaas_wallet_id text;

INSERT INTO public.tenants_private (tenant_id, asaas_wallet_id)
SELECT id, asaas_wallet_id FROM public.tenants WHERE asaas_wallet_id IS NOT NULL
ON CONFLICT (tenant_id) DO UPDATE SET asaas_wallet_id = EXCLUDED.asaas_wallet_id;

ALTER TABLE public.tenants DROP COLUMN IF EXISTS asaas_wallet_id;

DROP POLICY IF EXISTS "Public can view delivery links for redemption" ON public.coach_automated_delivery;

CREATE OR REPLACE FUNCTION public.redeem_delivery_lookup(p_token text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  token text,
  plan_id uuid,
  diet_id uuid,
  is_active boolean,
  created_at timestamptz,
  template_titulo text,
  template_resumo text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.user_id, d.token, d.plan_id, d.diet_id, d.is_active, d.created_at,
         t.titulo, t.resumo
  FROM public.coach_automated_delivery d
  LEFT JOIN public.templates_treino t ON t.id = d.plan_id
  WHERE d.token = p_token AND d.is_active = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.redeem_delivery_lookup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_delivery_lookup(text) TO anon, authenticated;
