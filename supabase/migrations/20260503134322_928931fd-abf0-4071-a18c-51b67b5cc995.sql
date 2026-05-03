
DO $$
DECLARE
  v_uid uuid := '692a1b44-4f07-49a5-baa6-6903a2d8f859';
BEGIN
  -- Marca como coach nos metadados
  UPDATE auth.users
     SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_coach": true}'::jsonb
   WHERE id = v_uid;

  -- Limpa vínculos com tenant aluno
  DELETE FROM public.assinaturas WHERE aluno_id = v_uid;
  DELETE FROM public.anamnese_aluno WHERE aluno_id = v_uid;
  DELETE FROM public.avaliacoes_fisicas WHERE aluno_id = v_uid;
  DELETE FROM public.perfis_treino WHERE aluno_id = v_uid;
  DELETE FROM public.alunos WHERE id = v_uid;

  -- Remove tenant_id do perfil para não cair no app do aluno
  UPDATE public.perfis
     SET tenant_id = NULL,
         onboarding_completo = false
   WHERE id = v_uid;
END $$;
