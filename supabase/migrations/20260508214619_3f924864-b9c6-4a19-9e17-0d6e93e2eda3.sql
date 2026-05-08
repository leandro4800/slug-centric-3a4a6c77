
CREATE OR REPLACE FUNCTION public.auto_activate_badboyteam_test()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid := '8c64bb80-9bed-45ff-bc0a-f4d1a2841d1c';
  v_plano_id  uuid := '3d0f1e85-d022-40f9-9cb7-4d46da8eee84';
BEGIN
  IF lower(NEW.email) IN ('leonardo.vpereira92@gmail.com','laenderfelip@gmail.com') THEN
    INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status, current_period_end)
    VALUES (NEW.id, v_tenant_id, v_plano_id, 'active', now() + interval '100 years')
    ON CONFLICT (aluno_id, tenant_id) DO UPDATE
      SET status = 'active',
          plano_id = EXCLUDED.plano_id,
          current_period_end = EXCLUDED.current_period_end;

    UPDATE public.perfis
       SET tenant_id = v_tenant_id,
           onboarding_completo = true
     WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_activate_badboyteam_test ON auth.users;
CREATE TRIGGER trg_auto_activate_badboyteam_test
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_activate_badboyteam_test();
