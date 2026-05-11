-- Remover completamente cadastro do executionmode48@gmail.com para permitir novo cadastro
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'executionmode48@gmail.com';
  IF v_uid IS NOT NULL THEN
    DELETE FROM public.assinaturas WHERE aluno_id = v_uid;
    DELETE FROM public.user_roles WHERE user_id = v_uid;
    DELETE FROM public.perfis_treino WHERE aluno_id = v_uid;
    DELETE FROM public.alunos WHERE id = v_uid;
    UPDATE public.vouchers SET used_by = NULL, used_at = NULL WHERE used_by = v_uid;
    DELETE FROM public.perfis WHERE id = v_uid;
    DELETE FROM auth.users WHERE id = v_uid;
  END IF;
END $$;