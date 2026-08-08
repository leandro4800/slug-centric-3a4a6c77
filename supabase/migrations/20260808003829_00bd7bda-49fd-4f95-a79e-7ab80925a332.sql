CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id uuid;
  v_plan_id uuid;
  v_tenant_is_free boolean := false;
BEGIN
  BEGIN
    v_tenant_id := NULLIF(NEW.raw_user_meta_data->>'tenant_id', '')::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_tenant_id := NULL;
  END;

  IF v_tenant_id IS NOT NULL THEN
    SELECT COALESCE(t.free_access, false)
      INTO v_tenant_is_free
      FROM public.tenants t
     WHERE t.id = v_tenant_id
       AND t.status = 'approved'::public.tenant_status;

    IF NOT FOUND THEN
      v_tenant_id := NULL;
      v_tenant_is_free := false;
    END IF;
  END IF;

  INSERT INTO public.perfis (id, email, nome_completo, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nome_completo'), ''), NEW.email),
    v_tenant_id
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        nome_completo = COALESCE(NULLIF(EXCLUDED.nome_completo, ''), public.perfis.nome_completo),
        tenant_id = COALESCE(public.perfis.tenant_id, EXCLUDED.tenant_id);

  IF v_tenant_id IS NOT NULL AND v_tenant_is_free THEN
    SELECT p.id
      INTO v_plan_id
      FROM public.planos p
     WHERE p.tenant_id = v_tenant_id
       AND p.ativo = true
     ORDER BY p.ordem ASC
     LIMIT 1;

    v_plan_id := COALESCE(v_plan_id, '11111111-1111-1111-1111-111111111111'::uuid);

    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (NEW.id, 'aluno'::public.app_role, v_tenant_id)
    ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

    INSERT INTO public.alunos (id, nome, tenant_id)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nome_completo'), ''), NEW.email, 'Aluno'),
      v_tenant_id
    )
    ON CONFLICT (id) DO UPDATE
      SET nome = EXCLUDED.nome,
          tenant_id = EXCLUDED.tenant_id,
          updated_at = now();

    INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status, current_period_end)
    VALUES (
      NEW.id,
      v_tenant_id,
      v_plan_id,
      'active'::public.assinatura_status,
      now() + interval '100 years'
    )
    ON CONFLICT (aluno_id, tenant_id) DO UPDATE
      SET plano_id = EXCLUDED.plano_id,
          status = 'active'::public.assinatura_status,
          current_period_end = EXCLUDED.current_period_end,
          updated_at = now();
  END IF;

  RETURN NEW;
END;
$function$;