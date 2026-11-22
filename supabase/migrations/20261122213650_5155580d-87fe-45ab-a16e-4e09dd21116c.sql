ALTER TABLE public.sessoes_treino ADD COLUMN IF NOT EXISTS cancelada_em timestamptz;

-- Treino (dia_semana) já concluído na mesma semana (segunda a domingo) pelo aluno
CREATE OR REPLACE FUNCTION public.sessao_treino_dia_concluido_semana(_aluno uuid, _tenant uuid, _dia text, _data date, _ignorar uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sessoes_treino c
    WHERE c.aluno_id = _aluno
      AND c.tenant_id IS NOT DISTINCT FROM _tenant
      AND c.dia_semana IS NOT DISTINCT FROM _dia
      AND c.duracao_min > 0
      AND c.cancelada_em IS NULL
      AND (_ignorar IS NULL OR c.id <> _ignorar)
      AND date_trunc('week', c.data_treino::timestamp) = date_trunc('week', _data::timestamp)
  );
$$;
REVOKE EXECUTE ON FUNCTION public.sessao_treino_dia_concluido_semana(uuid, uuid, text, date, uuid) FROM PUBLIC, anon, authenticated;

-- Encerra (sem apagar e sem concluir) sessões em andamento inválidas de um aluno
CREATE OR REPLACE FUNCTION public.encerrar_sessoes_treino_invalidas_aluno(_aluno uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer := 0;
BEGIN
  UPDATE public.sessoes_treino s
     SET cancelada_em = now()
   WHERE s.aluno_id = _aluno
     AND s.duracao_min = 0
     AND s.cancelada_em IS NULL
     AND (
       s.created_at < now() - interval '12 hours'
       OR public.sessao_treino_dia_concluido_semana(s.aluno_id, s.tenant_id, s.dia_semana, s.data_treino, s.id)
     );
  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN v_total;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.encerrar_sessoes_treino_invalidas_aluno(uuid) FROM PUBLIC, anon, authenticated;

-- Validação no banco: treino concluído 1x por semana e 1 sessão em andamento por aluno
CREATE OR REPLACE FUNCTION public.tg_validar_sessao_treino()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_abre boolean := false;
  v_outra record;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_abre := NEW.duracao_min = 0 AND NEW.cancelada_em IS NULL;
    IF EXISTS (
      SELECT 1 FROM public.sessoes_treino c
      WHERE c.aluno_id = NEW.aluno_id
        AND c.tenant_id IS NOT DISTINCT FROM NEW.tenant_id
        AND c.dia_semana IS NOT DISTINCT FROM NEW.dia_semana
        AND c.duracao_min > 0
        AND c.cancelada_em IS NULL
        AND date_trunc('week', c.data_treino::timestamp) = date_trunc('week', NEW.data_treino::timestamp)
        -- mesmo dia/data concluído cai no ON CONFLICT legado (não duplica)
        AND (v_abre OR c.data_treino <> NEW.data_treino)
    ) THEN
      RAISE EXCEPTION 'Este treino já foi concluído nesta semana.' USING ERRCODE = 'P0001', HINT = 'treino_ja_concluido_semana';
    END IF;
  ELSE
    IF OLD.duracao_min = 0 AND NEW.duracao_min > 0 THEN
      IF public.sessao_treino_dia_concluido_semana(NEW.aluno_id, NEW.tenant_id, NEW.dia_semana, NEW.data_treino, NEW.id) THEN
        RAISE EXCEPTION 'Este treino já foi concluído nesta semana.' USING ERRCODE = 'P0001', HINT = 'treino_ja_concluido_semana';
      END IF;
      NEW.cancelada_em := NULL;
    ELSIF NEW.duracao_min = 0 AND NEW.cancelada_em IS NULL AND OLD.cancelada_em IS NOT NULL THEN
      v_abre := true;
      IF public.sessao_treino_dia_concluido_semana(NEW.aluno_id, NEW.tenant_id, NEW.dia_semana, NEW.data_treino, NEW.id) THEN
        RAISE EXCEPTION 'Este treino já foi concluído nesta semana.' USING ERRCODE = 'P0001', HINT = 'treino_ja_concluido_semana';
      END IF;
    END IF;
  END IF;

  IF v_abre THEN
    PERFORM public.encerrar_sessoes_treino_invalidas_aluno(NEW.aluno_id);
    SELECT o.id, o.dia_semana INTO v_outra
      FROM public.sessoes_treino o
     WHERE o.aluno_id = NEW.aluno_id
       AND o.duracao_min = 0
       AND o.cancelada_em IS NULL
       AND o.id <> NEW.id
     LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'Você já tem um treino em andamento (%). Finalize ou cancele antes de iniciar outro.', v_outra.dia_semana
        USING ERRCODE = 'P0001', HINT = 'treino_em_andamento';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.tg_validar_sessao_treino() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sessoes_treino_validar ON public.sessoes_treino;
CREATE TRIGGER trg_sessoes_treino_validar
BEFORE INSERT OR UPDATE ON public.sessoes_treino
FOR EACH ROW EXECUTE FUNCTION public.tg_validar_sessao_treino();

-- RPC: limpa sessões presas do aluno logado
CREATE OR REPLACE FUNCTION public.limpar_sessoes_treino_invalidas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;
  RETURN public.encerrar_sessoes_treino_invalidas_aluno(auth.uid());
END;
$$;
REVOKE EXECUTE ON FUNCTION public.limpar_sessoes_treino_invalidas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.limpar_sessoes_treino_invalidas() TO authenticated;

-- RPC: inicia (ou retoma no mesmo dia) a sessão do treino escolhido
CREATE OR REPLACE FUNCTION public.iniciar_sessao_treino(_tenant_id uuid, _dia_semana text, _exercicios_total integer DEFAULT 0)
RETURNS TABLE(id uuid, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_data date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_existente record;
  v_id uuid;
  v_created timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;
  IF _tenant_id IS NULL OR NOT public.user_belongs_to_tenant(v_uid, _tenant_id) THEN
    RAISE EXCEPTION 'Não autorizado' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(btrim(_dia_semana), '') = '' THEN
    RAISE EXCEPTION 'Treino inválido' USING ERRCODE = '22023';
  END IF;

  SELECT s.id, s.duracao_min, s.cancelada_em INTO v_existente
    FROM public.sessoes_treino s
   WHERE s.aluno_id = v_uid AND s.data_treino = v_data AND s.dia_semana = _dia_semana
   FOR UPDATE;

  IF FOUND THEN
    IF v_existente.duracao_min > 0 THEN
      RAISE EXCEPTION 'Este treino já foi concluído nesta semana.' USING ERRCODE = 'P0001', HINT = 'treino_ja_concluido_semana';
    END IF;
    UPDATE public.sessoes_treino s
       SET cancelada_em = NULL,
           created_at = CASE WHEN s.cancelada_em IS NOT NULL THEN now() ELSE s.created_at END,
           tenant_id = _tenant_id,
           exercicios_total = GREATEST(COALESCE(_exercicios_total, 0), 0)
     WHERE s.id = v_existente.id
     RETURNING s.id, s.created_at INTO v_id, v_created;
  ELSE
    INSERT INTO public.sessoes_treino (aluno_id, tenant_id, data_treino, dia_semana, duracao_min, exercicios_total)
    VALUES (v_uid, _tenant_id, v_data, _dia_semana, 0, GREATEST(COALESCE(_exercicios_total, 0), 0))
    RETURNING sessoes_treino.id, sessoes_treino.created_at INTO v_id, v_created;
  END IF;

  RETURN QUERY SELECT v_id, v_created;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.iniciar_sessao_treino(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_sessao_treino(uuid, text, integer) TO authenticated;

-- RPC: cancela a sessão em andamento sem registrar conclusão
CREATE OR REPLACE FUNCTION public.cancelar_sessao_treino(_sessao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.sessoes_treino;
  v_series integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_row FROM public.sessoes_treino WHERE id = _sessao_id AND aluno_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Treino não encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.duracao_min > 0 THEN
    RAISE EXCEPTION 'Treino já concluído não pode ser cancelado' USING ERRCODE = 'P0001';
  END IF;
  IF v_row.cancelada_em IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'removida', false, 'series', 0);
  END IF;

  SELECT count(*)::int INTO v_series FROM public.series_executadas WHERE sessao_id = _sessao_id;
  IF v_series = 0 THEN
    DELETE FROM public.sessoes_treino WHERE id = _sessao_id;
    RETURN jsonb_build_object('ok', true, 'removida', true, 'series', 0);
  END IF;

  UPDATE public.sessoes_treino SET cancelada_em = now() WHERE id = _sessao_id;
  RETURN jsonb_build_object('ok', true, 'removida', false, 'series', v_series);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cancelar_sessao_treino(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_sessao_treino(uuid) TO authenticated;

-- ===== Limpeza dos dados já afetados =====
-- 1) Encerra sessões em andamento órfãs (treino já concluído na semana ou abertas há mais de 12h)
UPDATE public.sessoes_treino s
   SET cancelada_em = now()
 WHERE s.duracao_min = 0
   AND s.cancelada_em IS NULL
   AND (
     s.created_at < now() - interval '12 hours'
     OR public.sessao_treino_dia_concluido_semana(s.aluno_id, s.tenant_id, s.dia_semana, s.data_treino, s.id)
   );

-- 1b) Se ainda houver mais de uma aberta por aluno, mantém só a mais recente
UPDATE public.sessoes_treino s
   SET cancelada_em = now()
 WHERE s.duracao_min = 0
   AND s.cancelada_em IS NULL
   AND EXISTS (
     SELECT 1 FROM public.sessoes_treino n
      WHERE n.aluno_id = s.aluno_id AND n.duracao_min = 0 AND n.cancelada_em IS NULL
        AND (n.created_at > s.created_at OR (n.created_at = s.created_at AND n.id > s.id))
   );

-- 2) Duplicados do mesmo treino concluído na mesma semana: preserva a primeira conclusão válida
--    e só remove cópias sem séries cuja remoção não altera dias, minutos nem sequência.
WITH base AS (
  SELECT s.id, s.aluno_id, s.tenant_id, s.dia_semana, s.data_treino, s.duracao_min, s.created_at,
         EXISTS (SELECT 1 FROM public.series_executadas se WHERE se.sessao_id = s.id) AS tem_series
    FROM public.sessoes_treino s
   WHERE s.duracao_min > 0 AND s.cancelada_em IS NULL
), ranked AS (
  SELECT b.*,
         row_number() OVER (
           PARTITION BY b.aluno_id, b.tenant_id, b.dia_semana, date_trunc('week', b.data_treino::timestamp)
           ORDER BY b.tem_series DESC, b.data_treino, b.created_at, b.id
         ) AS rn
    FROM base b
)
DELETE FROM public.sessoes_treino d
 USING ranked r
 WHERE d.id = r.id
   AND r.rn > 1
   AND NOT r.tem_series
   AND EXISTS (
     SELECT 1 FROM public.sessoes_treino o
      WHERE o.aluno_id = r.aluno_id
        AND o.data_treino = r.data_treino
        AND o.id <> r.id
        AND o.duracao_min >= r.duracao_min
   );

-- Garantia final: no máximo 1 sessão em andamento por aluno
CREATE UNIQUE INDEX IF NOT EXISTS sessoes_treino_uma_aberta_por_aluno
  ON public.sessoes_treino (aluno_id)
  WHERE duracao_min = 0 AND cancelada_em IS NULL;