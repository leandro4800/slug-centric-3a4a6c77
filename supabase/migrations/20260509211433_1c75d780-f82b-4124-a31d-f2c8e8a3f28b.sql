
-- Vouchers table for free unlimited access (no Stripe charge)
CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  tenant_id uuid NOT NULL,
  plano_id uuid NOT NULL,
  used_by uuid,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read a voucher to validate (needed for redeem flow)
CREATE POLICY "vouchers_select_any_auth" ON public.vouchers
FOR SELECT TO authenticated USING (true);

-- Coach do tenant gerencia
CREATE POLICY "vouchers_manage_owner" ON public.vouchers
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM tenants t WHERE t.id = vouchers.tenant_id AND t.owner_user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM tenants t WHERE t.id = vouchers.tenant_id AND t.owner_user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- RPC: redeem voucher -> creates active assinatura (lifetime) for caller
CREATE OR REPLACE FUNCTION public.redeem_voucher(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher public.vouchers%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_voucher FROM public.vouchers WHERE upper(code) = upper(trim(_code)) FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;
  IF v_voucher.used_by IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_used');
  END IF;
  IF v_voucher.expires_at IS NOT NULL AND v_voucher.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  -- Create / upgrade assinatura
  INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status, current_period_end)
  VALUES (v_uid, v_voucher.tenant_id, v_voucher.plano_id, 'active', now() + interval '100 years')
  ON CONFLICT (aluno_id, tenant_id) DO UPDATE
    SET status = 'active',
        plano_id = EXCLUDED.plano_id,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = now();

  -- Vincula perfil ao tenant
  UPDATE public.perfis
     SET tenant_id = v_voucher.tenant_id
   WHERE id = v_uid AND (tenant_id IS NULL OR tenant_id <> v_voucher.tenant_id);

  -- Marca voucher usado
  UPDATE public.vouchers
     SET used_by = v_uid, used_at = now()
   WHERE id = v_voucher.id;

  RETURN jsonb_build_object('ok', true, 'tenant_id', v_voucher.tenant_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_voucher(text) TO authenticated;

-- Seed 10 codes per tenant (Alpha, Jackson, Bad Boy, Samila)
INSERT INTO public.vouchers (code, tenant_id, plano_id)
SELECT
  upper(prefix || '-' || substr(md5(random()::text || clock_timestamp()::text || gs::text), 1, 6)),
  tenant_id::uuid,
  plano_id::uuid
FROM (VALUES
  ('ALPHA',  '6c4ff89c-3d9f-4225-ae95-5bf1dbf35886', '11111111-1111-1111-1111-111111111111'),
  ('JACKSON','ca38c1a1-06b8-4549-9bfa-f06603ac08e9', '6eec1a95-0530-4755-bce1-ac7c9c1f7531'),
  ('BADBOY', '8c64bb80-9bed-45ff-bc0a-f4d1a2841d1c', '3d0f1e85-d022-40f9-9cb7-4d46da8eee84'),
  ('SAMILA', '5996d70b-9293-4c49-b143-42a4b60af267', '20d5e680-e315-44a0-a2dc-a78408230cbf')
) AS t(prefix, tenant_id, plano_id)
CROSS JOIN generate_series(1,10) AS gs;
