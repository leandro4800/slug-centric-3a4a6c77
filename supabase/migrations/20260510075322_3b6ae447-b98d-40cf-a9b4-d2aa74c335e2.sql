CREATE OR REPLACE FUNCTION public.redeem_voucher(_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status, current_period_end)
  VALUES (v_uid, v_voucher.tenant_id, v_voucher.plano_id, 'active', now() + interval '100 years')
  ON CONFLICT (aluno_id, tenant_id) DO UPDATE
    SET status = 'active',
        plano_id = EXCLUDED.plano_id,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = now();

  UPDATE public.perfis
     SET tenant_id = v_voucher.tenant_id
   WHERE id = v_uid AND (tenant_id IS NULL OR tenant_id <> v_voucher.tenant_id);

  -- Garante o papel de aluno no tenant para passar pelo RequireAuth
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (v_uid, 'aluno'::public.app_role, v_voucher.tenant_id)
  ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

  UPDATE public.vouchers
     SET used_by = v_uid, used_at = now()
   WHERE id = v_voucher.id;

  RETURN jsonb_build_object('ok', true, 'tenant_id', v_voucher.tenant_id);
END;
$function$;