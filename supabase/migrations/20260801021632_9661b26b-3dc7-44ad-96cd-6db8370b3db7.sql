CREATE TABLE IF NOT EXISTS public.sessoes_treino (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL,
  tenant_id uuid,
  data_treino date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  dia_semana text,
  duracao_min integer NOT NULL DEFAULT 60,
  exercicios_total integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, data_treino, dia_semana)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessoes_treino TO authenticated;
GRANT ALL ON public.sessoes_treino TO service_role;

ALTER TABLE public.sessoes_treino ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno gerencia suas sessoes"
ON public.sessoes_treino FOR ALL TO authenticated
USING (aluno_id = auth.uid())
WITH CHECK (aluno_id = auth.uid());

CREATE POLICY "Staff ve sessoes do tenant"
ON public.sessoes_treino FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (tenant_id IS NOT NULL AND public.has_role(auth.uid(), 'coach'::public.app_role, tenant_id))
  OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = sessoes_treino.tenant_id AND t.owner_user_id = auth.uid())
);

CREATE TRIGGER trg_sessoes_treino_updated_at
BEFORE UPDATE ON public.sessoes_treino
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.registrar_sessao_treino(
  _tenant_id uuid,
  _dia_semana text,
  _duracao_min integer DEFAULT 60,
  _exercicios_total integer DEFAULT 0,
  _data date DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_data date := COALESCE(_data, (now() AT TIME ZONE 'America/Sao_Paulo')::date);
  v_dur integer := LEAST(GREATEST(COALESCE(_duracao_min, 60), 10), 240);
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  INSERT INTO public.sessoes_treino (aluno_id, tenant_id, data_treino, dia_semana, duracao_min, exercicios_total)
  VALUES (v_uid, _tenant_id, v_data, COALESCE(_dia_semana, 'treino'), v_dur, GREATEST(COALESCE(_exercicios_total, 0), 0))
  ON CONFLICT (aluno_id, data_treino, dia_semana) DO UPDATE
    SET duracao_min = GREATEST(public.sessoes_treino.duracao_min, EXCLUDED.duracao_min),
        exercicios_total = GREATEST(public.sessoes_treino.exercicios_total, EXCLUDED.exercicios_total),
        tenant_id = COALESCE(EXCLUDED.tenant_id, public.sessoes_treino.tenant_id),
        updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_stats_treino(_aluno_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(_aluno_id, auth.uid());
  v_treinos integer := 0;
  v_minutos integer := 0;
  v_seq integer := 0;
  v_dia date;
  v_cursor date;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('treinos', 0, 'minutos', 0, 'sequencia', 0);
  END IF;

  SELECT COUNT(*)::int, COALESCE(SUM(duracao_min), 0)::int
    INTO v_treinos, v_minutos
    FROM public.sessoes_treino WHERE aluno_id = v_uid;

  v_cursor := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  IF NOT EXISTS (SELECT 1 FROM public.sessoes_treino WHERE aluno_id = v_uid AND data_treino = v_cursor) THEN
    v_cursor := v_cursor - 1;
  END IF;

  LOOP
    SELECT data_treino INTO v_dia
      FROM public.sessoes_treino
     WHERE aluno_id = v_uid AND data_treino = v_cursor
     LIMIT 1;
    EXIT WHEN v_dia IS NULL;
    v_seq := v_seq + 1;
    v_cursor := v_cursor - 1;
    v_dia := NULL;
  END LOOP;

  RETURN jsonb_build_object('treinos', v_treinos, 'minutos', v_minutos, 'sequencia', v_seq);
END;
$$;

INSERT INTO public.sessoes_treino (aluno_id, tenant_id, data_treino, dia_semana, duracao_min, exercicios_total)
SELECT h.user_id,
       (array_agg(h.tenant_id))[1],
       h.data_treino,
       COALESCE(NULLIF(split_part(h.exercicio_nome, ':', 2), ''), 'treino'),
       60,
       COALESCE(MAX(h.repeticoes_feitas), 0)
  FROM public.historico_cargas h
 WHERE h.data_treino IS NOT NULL
 GROUP BY h.user_id, h.data_treino, COALESCE(NULLIF(split_part(h.exercicio_nome, ':', 2), ''), 'treino')
ON CONFLICT (aluno_id, data_treino, dia_semana) DO NOTHING;