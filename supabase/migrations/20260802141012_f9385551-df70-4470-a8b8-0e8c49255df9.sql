CREATE TABLE IF NOT EXISTS public.stats_treino_aluno (
  aluno_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid,
  treinos_total integer NOT NULL DEFAULT 0,
  minutos_total integer NOT NULL DEFAULT 0,
  sequencia_atual integer NOT NULL DEFAULT 0,
  melhor_sequencia integer NOT NULL DEFAULT 0,
  ultimo_treino date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.stats_treino_aluno TO authenticated;
GRANT ALL ON public.stats_treino_aluno TO service_role;

ALTER TABLE public.stats_treino_aluno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stats_treino_self_read" ON public.stats_treino_aluno;
CREATE POLICY "stats_treino_self_read" ON public.stats_treino_aluno
FOR SELECT TO authenticated
USING (
  aluno_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (tenant_id IS NOT NULL AND public.has_role(auth.uid(), 'coach'::public.app_role, tenant_id))
  OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = stats_treino_aluno.tenant_id AND t.owner_user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.recalcular_stats_treino(_aluno_id uuid)
RETURNS public.stats_treino_aluno
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  r RECORD;
BEGIN
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

  -- sequência: dias de treino encadeados, tolerando até 2 dias de descanso entre eles
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
$$;

CREATE OR REPLACE FUNCTION public.tg_recalcular_stats_treino()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalcular_stats_treino(COALESCE(NEW.aluno_id, OLD.aluno_id));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sessoes_treino_stats ON public.sessoes_treino;
CREATE TRIGGER trg_sessoes_treino_stats
AFTER INSERT OR UPDATE OR DELETE ON public.sessoes_treino
FOR EACH ROW EXECUTE FUNCTION public.tg_recalcular_stats_treino();

CREATE OR REPLACE FUNCTION public.get_stats_treino(_aluno_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(_aluno_id, auth.uid());
  v_row public.stats_treino_aluno;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('treinos', 0, 'minutos', 0, 'sequencia', 0, 'melhor_sequencia', 0);
  END IF;

  v_row := public.recalcular_stats_treino(v_uid);

  RETURN jsonb_build_object(
    'treinos', COALESCE(v_row.treinos_total, 0),
    'minutos', COALESCE(v_row.minutos_total, 0),
    'sequencia', COALESCE(v_row.sequencia_atual, 0),
    'melhor_sequencia', COALESCE(v_row.melhor_sequencia, 0),
    'ultimo_treino', v_row.ultimo_treino
  );
END;
$$;

-- popula stats para quem já tem sessões
DO $$
DECLARE a uuid;
BEGIN
  FOR a IN SELECT DISTINCT aluno_id FROM public.sessoes_treino LOOP
    PERFORM public.recalcular_stats_treino(a);
  END LOOP;
END $$;