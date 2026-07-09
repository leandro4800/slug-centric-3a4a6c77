
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_tenant_id uuid;
  v_email text := 'ctalphacoach@coach.app';
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  ELSE
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_email, crypt('alphapro2026', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nome_completo','CT Alphacoach'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id, jsonb_build_object('sub', v_user_id::text, 'email', v_email), 'email', v_user_id::text, now(), now(), now());
  END IF;

  INSERT INTO public.tenants (nome, slug, vertical, status, owner_user_id)
  VALUES ('CT Alphacoach', 'ct-alphacoach', 'fight'::tenant_vertical, 'approved'::tenant_status, v_user_id)
  ON CONFLICT (slug) DO UPDATE SET vertical='fight'::tenant_vertical, status='approved'::tenant_status, owner_user_id=EXCLUDED.owner_user_id
  RETURNING id INTO v_tenant_id;
END $$;
