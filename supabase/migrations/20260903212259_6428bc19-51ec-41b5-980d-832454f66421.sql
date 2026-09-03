CREATE OR REPLACE FUNCTION public.sync_perfil_treino_from_avaliacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.perfis_treino
     SET peso_kg    = COALESCE(NEW.peso_kg, peso_kg),
         altura_cm  = COALESCE(NEW.altura_cm, altura_cm),
         bf_pct     = COALESCE(NEW.bf_pct_calculado, bf_pct),
         pescoco_cm = COALESCE(NEW.pescoco_cm, pescoco_cm),
         cintura_cm = COALESCE(NEW.cintura_cm, cintura_cm),
         quadril_cm = COALESCE(NEW.quadril_cm, quadril_cm),
         updated_at = now()
   WHERE aluno_id = NEW.aluno_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_student_onboarding(_tenant_id uuid, _nome_completo text, _telefone text, _data_nascimento date, _sexo text, _anamnese jsonb, _avaliacao jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_tenant_exists boolean;
  v_peso numeric;
  v_altura numeric;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF _tenant_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_tenant');
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant_id)
    INTO v_tenant_exists;

  IF NOT v_tenant_exists THEN
    RETURN jsonb_build_object('ok', false, 'error', 'tenant_not_found');
  END IF;

  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_uid;

  v_peso := NULLIF(_avaliacao->>'peso_kg', '')::numeric;
  v_altura := NULLIF(_avaliacao->>'altura_cm', '')::numeric;

  IF v_peso IS NULL OR v_peso <= 0 OR v_altura IS NULL OR v_altura <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_evaluation');
  END IF;

  INSERT INTO public.perfis (
    id, email, nome_completo, telefone, data_nascimento, sexo, tenant_id, onboarding_completo, updated_at
  )
  VALUES (
    v_uid, v_email, NULLIF(trim(_nome_completo), ''), NULLIF(trim(_telefone), ''),
    _data_nascimento, _sexo, _tenant_id, true, now()
  )
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(public.perfis.email, EXCLUDED.email),
        nome_completo = COALESCE(EXCLUDED.nome_completo, public.perfis.nome_completo),
        telefone = EXCLUDED.telefone,
        data_nascimento = EXCLUDED.data_nascimento,
        sexo = EXCLUDED.sexo,
        tenant_id = EXCLUDED.tenant_id,
        onboarding_completo = true,
        updated_at = now();

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (v_uid, _tenant_id, 'aluno'::public.app_role)
  ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

  INSERT INTO public.alunos (id, nome, tenant_id)
  VALUES (v_uid, COALESCE(NULLIF(trim(_nome_completo), ''), v_email, 'Aluno'), _tenant_id)
  ON CONFLICT (id) DO UPDATE
    SET nome = EXCLUDED.nome,
        tenant_id = EXCLUDED.tenant_id,
        updated_at = now();

  INSERT INTO public.anamnese_aluno (
    aluno_id, tenant_id, doencas, medicamentos, lesoes_atuais, qualidade_sono, horas_sono,
    nivel_estresse, tabagismo, alcool, suplementos, restricoes_alimentares, refeicoes_dia,
    agua_litros, anos_treino, disponibilidade_dias, nivel_experiencia, faz_uso_ergogenicos,
    detalhes_ergogenicos, updated_at
  )
  VALUES (
    v_uid,
    _tenant_id,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(_anamnese->'doencas', '[]'::jsonb))), '{}'::text[]),
    NULLIF(_anamnese->>'medicamentos', ''),
    NULLIF(_anamnese->>'lesoes_atuais', ''),
    LEAST(GREATEST(COALESCE(NULLIF(_anamnese->>'qualidade_sono', '')::integer, 7), 1), 10),
    LEAST(GREATEST(COALESCE(NULLIF(_anamnese->>'horas_sono', '')::numeric, 7), 0), 24),
    LEAST(GREATEST(COALESCE(NULLIF(_anamnese->>'nivel_estresse', '')::integer, 5), 1), 10),
    COALESCE(NULLIF(_anamnese->>'tabagismo', '')::boolean, false),
    NULLIF(_anamnese->>'alcool', ''),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(_anamnese->'suplementos', '[]'::jsonb))), '{}'::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(_anamnese->'restricoes_alimentares', '[]'::jsonb))), '{}'::text[]),
    NULLIF(_anamnese->>'refeicoes_dia', '')::integer,
    NULLIF(_anamnese->>'agua_litros', '')::numeric,
    NULLIF(_anamnese->>'anos_treino', '')::numeric,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(_anamnese->'disponibilidade_dias', '[]'::jsonb))), '{}'::text[]),
    NULLIF(_anamnese->>'nivel_experiencia', ''),
    COALESCE(NULLIF(_anamnese->>'faz_uso_ergogenicos', '')::boolean, false),
    NULLIF(_anamnese->>'detalhes_ergogenicos', ''),
    now()
  )
  ON CONFLICT (aluno_id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        doencas = EXCLUDED.doencas,
        medicamentos = EXCLUDED.medicamentos,
        lesoes_atuais = EXCLUDED.lesoes_atuais,
        qualidade_sono = EXCLUDED.qualidade_sono,
        horas_sono = EXCLUDED.horas_sono,
        nivel_estresse = EXCLUDED.nivel_estresse,
        tabagismo = EXCLUDED.tabagismo,
        alcool = EXCLUDED.alcool,
        suplementos = EXCLUDED.suplementos,
        restricoes_alimentares = EXCLUDED.restricoes_alimentares,
        refeicoes_dia = EXCLUDED.refeicoes_dia,
        agua_litros = EXCLUDED.agua_litros,
        anos_treino = EXCLUDED.anos_treino,
        disponibilidade_dias = EXCLUDED.disponibilidade_dias,
        nivel_experiencia = EXCLUDED.nivel_experiencia,
        faz_uso_ergogenicos = EXCLUDED.faz_uso_ergogenicos,
        detalhes_ergogenicos = EXCLUDED.detalhes_ergogenicos,
        updated_at = now();

  INSERT INTO public.avaliacoes_fisicas (
    aluno_id, tenant_id, peso_kg, altura_cm, pescoco_cm, cintura_cm, quadril_cm,
    bf_pct_calculado, imc, massa_magra_kg, massa_gorda_kg, sexo
  )
  VALUES (
    v_uid, _tenant_id, v_peso, v_altura,
    NULLIF(_avaliacao->>'pescoco_cm', '')::numeric,
    NULLIF(_avaliacao->>'cintura_cm', '')::numeric,
    NULLIF(_avaliacao->>'quadril_cm', '')::numeric,
    NULLIF(_avaliacao->>'bf_pct_calculado', '')::numeric,
    NULLIF(_avaliacao->>'imc', '')::numeric,
    NULLIF(_avaliacao->>'massa_magra_kg', '')::numeric,
    NULLIF(_avaliacao->>'massa_gorda_kg', '')::numeric,
    _sexo
  );

  INSERT INTO public.perfis_treino (aluno_id, tenant_id, sexo, peso_kg, altura_cm, bf_pct, pescoco_cm, cintura_cm, quadril_cm, updated_at)
  VALUES (
    v_uid, _tenant_id, _sexo, v_peso, v_altura,
    NULLIF(_avaliacao->>'bf_pct_calculado', '')::numeric,
    NULLIF(_avaliacao->>'pescoco_cm', '')::numeric,
    NULLIF(_avaliacao->>'cintura_cm', '')::numeric,
    NULLIF(_avaliacao->>'quadril_cm', '')::numeric,
    now()
  )
  ON CONFLICT (aluno_id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        sexo = COALESCE(EXCLUDED.sexo, public.perfis_treino.sexo),
        peso_kg = COALESCE(EXCLUDED.peso_kg, public.perfis_treino.peso_kg),
        altura_cm = COALESCE(EXCLUDED.altura_cm, public.perfis_treino.altura_cm),
        bf_pct = COALESCE(EXCLUDED.bf_pct, public.perfis_treino.bf_pct),
        pescoco_cm = COALESCE(EXCLUDED.pescoco_cm, public.perfis_treino.pescoco_cm),
        cintura_cm = COALESCE(EXCLUDED.cintura_cm, public.perfis_treino.cintura_cm),
        quadril_cm = COALESCE(EXCLUDED.quadril_cm, public.perfis_treino.quadril_cm),
        updated_at = now();

  RETURN jsonb_build_object('ok', true, 'tenant_id', _tenant_id);
EXCEPTION
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_numeric_value');
  WHEN others THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$function$;

-- Backfill único a partir da avaliação mais recente de cada aluno
WITH ultima AS (
  SELECT DISTINCT ON (aluno_id) aluno_id, altura_cm, pescoco_cm, cintura_cm, quadril_cm
  FROM public.avaliacoes_fisicas
  ORDER BY aluno_id, data DESC NULLS LAST, created_at DESC NULLS LAST
)
UPDATE public.perfis_treino pt
   SET altura_cm  = COALESCE(pt.altura_cm, u.altura_cm),
       pescoco_cm = COALESCE(pt.pescoco_cm, u.pescoco_cm),
       cintura_cm = COALESCE(pt.cintura_cm, u.cintura_cm),
       quadril_cm = COALESCE(pt.quadril_cm, u.quadril_cm),
       updated_at = now()
  FROM ultima u
 WHERE pt.aluno_id = u.aluno_id
   AND (
     (pt.pescoco_cm IS NULL AND u.pescoco_cm IS NOT NULL) OR
     (pt.cintura_cm IS NULL AND u.cintura_cm IS NOT NULL) OR
     (pt.quadril_cm IS NULL AND u.quadril_cm IS NOT NULL) OR
     (pt.altura_cm  IS NULL AND u.altura_cm  IS NOT NULL)
   );