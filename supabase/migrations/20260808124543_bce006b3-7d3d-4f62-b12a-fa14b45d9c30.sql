CREATE OR REPLACE FUNCTION public.get_my_app_destination()
RETURNS TABLE(tenant_id uuid, tenant_slug text, account_role public.app_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tenant_id uuid;
  v_tenant_slug text;
  v_role public.app_role;
  v_plan_id uuid;
  v_free_access boolean := false;
  v_name text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT t.id, t.slug, 'coach'::public.app_role
    INTO v_tenant_id, v_tenant_slug, v_role
  FROM public.tenants t
  WHERE t.owner_user_id = v_uid
    AND t.slug IS NOT NULL
    AND t.status = 'approved'::public.tenant_status
  ORDER BY t.slug
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    SELECT t.id, t.slug,
           CASE WHEN EXISTS (
             SELECT 1 FROM public.user_roles ur
             WHERE ur.user_id = v_uid
               AND ur.role = 'coach'::public.app_role
               AND (ur.tenant_id = p.tenant_id OR ur.tenant_id IS NULL)
           ) THEN 'coach'::public.app_role ELSE 'aluno'::public.app_role END
      INTO v_tenant_id, v_tenant_slug, v_role
    FROM public.perfis p
    JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.id = v_uid
      AND t.slug IS NOT NULL
      AND t.status = 'approved'::public.tenant_status
    LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    SELECT t.id, t.slug, 'aluno'::public.app_role
      INTO v_tenant_id, v_tenant_slug, v_role
    FROM public.assinaturas s
    JOIN public.tenants t ON t.id = s.tenant_id
    LEFT JOIN public.perfis p ON p.id = v_uid
    WHERE s.aluno_id = v_uid
      AND s.status IN ('active'::public.assinatura_status, 'trialing'::public.assinatura_status)
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
      AND t.slug IS NOT NULL
      AND t.status = 'approved'::public.tenant_status
    ORDER BY (s.tenant_id = p.tenant_id) DESC, s.current_period_end DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    SELECT t.id, t.slug, ur.role
      INTO v_tenant_id, v_tenant_slug, v_role
    FROM public.user_roles ur
    JOIN public.tenants t ON t.id = ur.tenant_id
    LEFT JOIN public.perfis p ON p.id = v_uid
    WHERE ur.user_id = v_uid
      AND ur.role IN ('coach'::public.app_role, 'aluno'::public.app_role)
      AND t.slug IS NOT NULL
      AND t.status = 'approved'::public.tenant_status
    ORDER BY (ur.role = 'coach'::public.app_role) DESC,
             (ur.tenant_id = p.tenant_id) DESC,
             t.slug
    LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    SELECT t.id, t.slug, 'aluno'::public.app_role
      INTO v_tenant_id, v_tenant_slug, v_role
    FROM public.alunos a
    JOIN public.tenants t ON t.id = a.tenant_id
    LEFT JOIN public.perfis p ON p.id = v_uid
    WHERE a.id = v_uid
      AND t.slug IS NOT NULL
      AND t.status = 'approved'::public.tenant_status
    ORDER BY (a.tenant_id = p.tenant_id) DESC, t.slug
    LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  IF v_role = 'aluno'::public.app_role THEN
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (v_uid, 'aluno'::public.app_role, v_tenant_id)
    ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

    SELECT COALESCE(NULLIF(trim(p.nome_completo), ''), p.email, 'Aluno')
      INTO v_name
    FROM public.perfis p
    WHERE p.id = v_uid;

    INSERT INTO public.alunos (id, nome, tenant_id)
    VALUES (v_uid, COALESCE(v_name, 'Aluno'), v_tenant_id)
    ON CONFLICT (id) DO UPDATE
      SET nome = COALESCE(NULLIF(public.alunos.nome, ''), EXCLUDED.nome),
          tenant_id = EXCLUDED.tenant_id,
          updated_at = now();

    UPDATE public.perfis
       SET tenant_id = v_tenant_id,
           updated_at = now()
     WHERE id = v_uid
       AND tenant_id IS NULL;

    SELECT t.free_access INTO v_free_access
    FROM public.tenants t
    WHERE t.id = v_tenant_id;

    IF COALESCE(v_free_access, false) THEN
      SELECT p.id INTO v_plan_id
      FROM public.planos p
      WHERE p.tenant_id = v_tenant_id
        AND p.ativo = true
      ORDER BY p.ordem ASC
      LIMIT 1;

      IF v_plan_id IS NOT NULL THEN
        INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status, current_period_end)
        VALUES (v_uid, v_tenant_id, v_plan_id, 'active'::public.assinatura_status, now() + interval '100 years')
        ON CONFLICT (aluno_id, tenant_id) DO UPDATE
          SET status = 'active'::public.assinatura_status,
              plano_id = EXCLUDED.plano_id,
              current_period_end = EXCLUDED.current_period_end,
              updated_at = now();
      END IF;
    END IF;
  END IF;

  tenant_id := v_tenant_id;
  tenant_slug := v_tenant_slug;
  account_role := v_role;
  RETURN NEXT;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_app_destination() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_app_destination() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_user_tenant()
RETURNS uuid
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT d.tenant_id
  FROM public.get_my_app_destination() d
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.current_user_tenant() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_tenant() TO authenticated, service_role;