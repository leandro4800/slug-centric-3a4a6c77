BEGIN;

-- Etapa 1a: funções de gatilho
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['auto_activate_badboyteam_test','detect_tenant_vertical','enforce_coach_platform_sub_financials','enforce_perfis_music_owner','enforce_perfis_tenant_lock','enforce_profissionais_identity_insert','enforce_profissionais_identity_lock','enforce_single_published_diet','ensure_tenant_owner_coach_role','notify_comunidade_comentario','notify_comunidade_mensagem','notify_comunidade_reacao','notify_story_reacao','prevent_unauthorized_tenant_change','story_reacao_to_mensagem','tg_atualiza_reservados_presencial','tg_recalcular_stats_treino','update_slot_reservados_count'] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I() FROM PUBLIC, anon, authenticated', f);
  END LOOP;
END $$;

-- Etapa 1b: exigem login
REVOKE EXECUTE ON FUNCTION public.get_community_members(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_community_members_meta(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_community_stories(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_community_stories_v2(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.registrar_sessao_treino(uuid, text, integer, integer, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_student_onboarding(uuid, text, text, date, text, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_voucher(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_stats_treino(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_community_members(uuid), public.get_community_members_meta(uuid), public.get_community_stories(uuid), public.get_community_stories_v2(uuid), public.registrar_sessao_treino(uuid, text, integer, integer, date), public.complete_student_onboarding(uuid, text, text, date, text, jsonb, jsonb), public.redeem_voucher(text), public.get_stats_treino(uuid) TO authenticated;

-- Etapa 2.1: base de conhecimento só para service_role (Edge Functions)
REVOKE EXECUTE ON FUNCTION public.buscar_conhecimento_treino(extensions.vector, uuid, integer, double precision, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_conhecimento_treino(extensions.vector, uuid, integer, double precision, text) TO service_role;

-- Etapa 2.2/2.3: checagem de quem chama em recalcular_stats_treino (get_stats_treino herda a checagem)
CREATE OR REPLACE FUNCTION public.recalcular_stats_treino(_aluno_id uuid)
 RETURNS stats_treino_aluno
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_treinos int := 0;
  v_minutos int := 0;
  v_seq int := 0;
  v_best int := 0;
  v_run int := 0;
  v_prev date := NULL;
  v_last date := NULL;
  v_tenant uuid;
  v_uid uuid := auth.uid();
  v_aluno_tenant uuid;
  r RECORD;
BEGIN
  IF NOT (
    pg_trigger_depth() > 0
    OR auth.role() = 'service_role'
    OR (v_uid IS NOT NULL AND v_uid = _aluno_id)
    OR (v_uid IS NOT NULL AND public.has_role(v_uid, 'admin'::public.app_role))
  ) THEN
    SELECT p.tenant_id INTO v_aluno_tenant FROM public.perfis p WHERE p.id = _aluno_id;
    IF v_uid IS NULL OR v_aluno_tenant IS NULL OR NOT (
      public.has_role(v_uid, 'coach'::public.app_role, v_aluno_tenant)
      OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = v_aluno_tenant AND t.owner_user_id = v_uid)
    ) THEN
      RAISE EXCEPTION 'Não autorizado' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT count(*)::int, COALESCE(sum(mins),0)::int, max(d)
    INTO v_treinos, v_minutos, v_last
  FROM (
    SELECT data_treino AS d, max(duracao_min) AS mins
    FROM public.sessoes_treino
    WHERE aluno_id = _aluno_id
    GROUP BY data_treino
  ) x;

  SELECT tenant_id INTO v_tenant
  FROM public.sessoes_treino
  WHERE aluno_id = _aluno_id AND tenant_id IS NOT NULL
  ORDER BY data_treino DESC LIMIT 1;

  FOR r IN
    SELECT DISTINCT data_treino AS d
    FROM public.sessoes_treino
    WHERE aluno_id = _aluno_id
    ORDER BY data_treino
  LOOP
    IF v_prev IS NULL OR (r.d - v_prev) > 3 THEN
      v_run := 1;
    ELSE
      v_run := v_run + 1;
    END IF;
    v_prev := r.d;
    IF v_run > v_best THEN v_best := v_run; END IF;
  END LOOP;

  IF v_last IS NOT NULL AND (v_hoje - v_last) <= 3 THEN
    v_seq := v_run;
  ELSE
    v_seq := 0;
  END IF;

  INSERT INTO public.stats_treino_aluno AS s
    (aluno_id, tenant_id, treinos_total, minutos_total, sequencia_atual, melhor_sequencia, ultimo_treino, updated_at)
  VALUES (_aluno_id, v_tenant, v_treinos, v_minutos, v_seq, v_best, v_last, now())
  ON CONFLICT (aluno_id) DO UPDATE
    SET tenant_id = COALESCE(EXCLUDED.tenant_id, s.tenant_id),
        treinos_total = EXCLUDED.treinos_total,
        minutos_total = EXCLUDED.minutos_total,
        sequencia_atual = EXCLUDED.sequencia_atual,
        melhor_sequencia = GREATEST(s.melhor_sequencia, EXCLUDED.melhor_sequencia),
        ultimo_treino = EXCLUDED.ultimo_treino,
        updated_at = now();

  RETURN (SELECT s2 FROM public.stats_treino_aluno s2 WHERE s2.aluno_id = _aluno_id);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.recalcular_stats_treino(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalcular_stats_treino(uuid) TO authenticated, service_role;

-- Etapa 2.4: helpers não usados em políticas anon/public
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_athlete_avatar(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(uuid), public.can_manage_athlete_avatar(uuid, uuid) TO authenticated, service_role;

-- Etapa 2.5: usadas só em telas de admin logado
REVOKE EXECUTE ON FUNCTION public.buscar_exercicios_similares(text, integer, real) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.listar_referencia_exercicios() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buscar_exercicios_similares(text, integer, real), public.listar_referencia_exercicios() TO authenticated, service_role;

COMMIT;