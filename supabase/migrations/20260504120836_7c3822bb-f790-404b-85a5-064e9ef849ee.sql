DO $$
DECLARE
  v_superadmin_id uuid;
BEGIN
  SELECT id INTO v_superadmin_id
  FROM public.perfis
  WHERE lower(email) = lower('alphacoachapp@gmail.com')
  LIMIT 1;

  IF v_superadmin_id IS NULL THEN
    RAISE EXCEPTION 'Superadmin alphacoachapp@gmail.com não encontrado em public.perfis';
  END IF;

  -- Remove todos os papéis, exceto o superadmin global informado.
  DELETE FROM public.user_roles
  WHERE NOT (user_id = v_superadmin_id AND role = 'admin'::public.app_role AND tenant_id IS NULL);

  -- Garante que o superadmin global exista mesmo se havia duplicidade/limpeza parcial.
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (v_superadmin_id, 'admin'::public.app_role, NULL)
  ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

  -- Reseta vínculos de perfis que não são o superadmin.
  UPDATE public.perfis
  SET tenant_id = NULL,
      onboarding_completo = false
  WHERE id <> v_superadmin_id;

  -- Remove tenants cadastrados/teste, mantendo apenas os tenants base do sistema.
  DELETE FROM public.tenants
  WHERE slug NOT IN ('alphateam', 'demo');
END $$;

-- Função segura para o frontend checar se um e-mail já tem perfil cadastrado.
CREATE OR REPLACE FUNCTION public.email_is_registered(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfis
    WHERE lower(email) = lower(trim(_email))
  );
$$;

REVOKE ALL ON FUNCTION public.email_is_registered(text) FROM public;
GRANT EXECUTE ON FUNCTION public.email_is_registered(text) TO anon, authenticated;