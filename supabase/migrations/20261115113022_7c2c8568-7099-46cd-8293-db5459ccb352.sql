-- Acesso
GRANT SELECT, UPDATE ON public.assistente_alertas TO authenticated;
GRANT ALL ON public.assistente_alertas TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.assistente_config TO authenticated;
GRANT ALL ON public.assistente_config TO service_role;
GRANT SELECT ON public.assistente_uso TO authenticated;
GRANT ALL ON public.assistente_uso TO service_role;
ALTER TABLE public.assistente_uso ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS assistente_uso_select ON public.assistente_uso;
CREATE POLICY assistente_uso_select ON public.assistente_uso FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = assistente_uso.tenant_id AND t.owner_user_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'::app_role));

-- Tipos e padrões
ALTER TABLE public.assistente_alertas DROP CONSTRAINT IF EXISTS assistente_alertas_tipo_check;
ALTER TABLE public.assistente_alertas ADD CONSTRAINT assistente_alertas_tipo_check CHECK (tipo = ANY (ARRAY[
  'sumindo','nunca_treinou','queda_frequencia','pagamento_vencido','renovacao_proxima','lucro_queda','retencao_queda','cac_alto']::text[]));

ALTER TABLE public.assistente_config
  ALTER COLUMN resumo_ativo SET DEFAULT true,
  ALTER COLUMN canal_push SET DEFAULT true,
  ALTER COLUMN tipos SET DEFAULT '{"sumindo": true, "queda_frequencia": true, "pagamento": true, "renovacao": true, "negocio": true}'::jsonb;

DROP TRIGGER IF EXISTS trg_assistente_alertas_updated ON public.assistente_alertas;
CREATE TRIGGER trg_assistente_alertas_updated BEFORE UPDATE ON public.assistente_alertas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_assistente_config_updated ON public.assistente_config;
CREATE TRIGGER trg_assistente_config_updated BEFORE UPDATE ON public.assistente_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- "Nunca treinou" vira só informação
UPDATE public.assistente_alertas SET estado = 'resolvido'
 WHERE tipo = 'nunca_treinou' AND estado IN ('novo','visto','adiado');

-- Números do mês (recebido já sem taxas, despesas com fixas repetidas, captação, ticket)
CREATE OR REPLACE FUNCTION public.assistente_financeiro_mes(p_tenant uuid, p_mes date)
RETURNS TABLE(receita bigint, receita_bruta bigint, despesas bigint, captacao bigint, ticket bigint, pagos integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH r AS (
    SELECT coalesce(sum(coalesce(valor_liquido_centavos, valor_bruto_centavos)), 0)::bigint AS rec,
           coalesce(sum(valor_bruto_centavos), 0)::bigint AS bruto,
           coalesce(round(avg(valor_bruto_centavos)), 0)::bigint AS tk,
           count(*)::int AS n
      FROM pagamentos
     WHERE tenant_id = p_tenant AND status = 'pago'
       AND date_trunc('month', coalesce(data_pagamento, created_at) AT TIME ZONE 'America/Sao_Paulo')::date = date_trunc('month', p_mes::timestamp)::date
  ), d AS (
    SELECT coalesce(sum(valor_centavos), 0)::bigint AS tot,
           coalesce(sum(valor_centavos) FILTER (WHERE gasto_captacao), 0)::bigint AS cap
      FROM despesas
     WHERE tenant_id = p_tenant
       AND ((NOT fixa AND date_trunc('month', data::timestamp)::date = date_trunc('month', p_mes::timestamp)::date)
         OR (fixa AND date_trunc('month', data::timestamp)::date <= date_trunc('month', p_mes::timestamp)::date))
  )
  SELECT r.rec, r.bruto, d.tot, d.cap, r.tk, r.n FROM r, d
$$;
REVOKE ALL ON FUNCTION public.assistente_financeiro_mes(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assistente_financeiro_mes(uuid, date) TO service_role;

-- Rotina diária de alertas (sem IA)
CREATE OR REPLACE FUNCTION public.gerar_alertas_assistente(p_tenant uuid DEFAULT NULL::uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_total integer := 0;
  v_n integer;
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_segunda boolean := extract(isodow FROM (now() AT TIME ZONE 'America/Sao_Paulo')) = 1;
  v_m1 date := (date_trunc('month', v_hoje::timestamp) - interval '1 month')::date;
  v_m2 date := (date_trunc('month', v_hoje::timestamp) - interval '2 month')::date;
  r record;
  f1 record;
  f2 record;
  v_novos integer;
  v_cac bigint;
  v_saidas_rec integer;
  v_saidas_ant integer;
BEGIN
  IF NOT pg_try_advisory_xact_lock(834721002) THEN
    RETURN 0;
  END IF;

  -- Resoluções automáticas
  UPDATE assistente_alertas al SET estado = 'resolvido'
   WHERE al.estado IN ('novo','visto','adiado') AND al.tipo IN ('sumindo','queda_frequencia')
     AND (p_tenant IS NULL OR al.tenant_id = p_tenant)
     AND NOT EXISTS (SELECT 1 FROM assinaturas a WHERE a.aluno_id = al.aluno_id AND a.tenant_id = al.tenant_id AND a.status IN ('active','trialing'));
  UPDATE assistente_alertas al SET estado = 'resolvido'
   WHERE al.estado IN ('novo','visto','adiado') AND al.tipo = 'sumindo'
     AND (p_tenant IS NULL OR al.tenant_id = p_tenant)
     AND EXISTS (SELECT 1 FROM stats_treino_aluno s
                  WHERE s.aluno_id = al.aluno_id AND s.tenant_id = al.tenant_id
                    AND s.ultimo_treino > (al.detalhe->>'ultimo_treino')::date);
  UPDATE assistente_alertas al SET estado = 'resolvido'
   WHERE al.estado IN ('novo','visto','adiado') AND al.tipo = 'queda_frequencia'
     AND (p_tenant IS NULL OR al.tenant_id = p_tenant)
     AND (SELECT count(DISTINCT st.data_treino) FROM sessoes_treino st
           WHERE st.aluno_id = al.aluno_id AND st.tenant_id = al.tenant_id AND st.data_treino > v_hoje - 7)
         >= greatest(1, floor(coalesce((al.detalhe->>'media_semanal')::numeric, 1)));
  UPDATE assistente_alertas al SET estado = 'resolvido'
   WHERE al.estado IN ('novo','visto','adiado') AND al.tipo = 'nunca_treinou'
     AND (p_tenant IS NULL OR al.tenant_id = p_tenant);
  UPDATE assistente_alertas al SET estado = 'resolvido'
   WHERE al.estado IN ('novo','visto','adiado') AND al.tipo = 'pagamento_vencido'
     AND (p_tenant IS NULL OR al.tenant_id = p_tenant)
     AND NOT EXISTS (SELECT 1 FROM pagamentos pg
                      WHERE pg.id = (al.detalhe->>'pagamento_id')::uuid AND pg.status = 'vencido');
  UPDATE assistente_alertas al SET estado = 'resolvido'
   WHERE al.estado IN ('novo','visto','adiado') AND al.tipo = 'renovacao_proxima'
     AND (p_tenant IS NULL OR al.tenant_id = p_tenant)
     AND NOT EXISTS (SELECT 1 FROM assinaturas a
                      WHERE a.id = (al.detalhe->>'assinatura_id')::uuid
                        AND a.status IN ('active','trialing')
                        AND a.current_period_end::date = (al.detalhe->>'periodo_fim')::date);
  IF v_segunda THEN
    UPDATE assistente_alertas al SET estado = 'resolvido'
     WHERE al.estado IN ('novo','visto','adiado') AND al.tipo IN ('lucro_queda','retencao_queda','cac_alto')
       AND (p_tenant IS NULL OR al.tenant_id = p_tenant)
       AND (al.created_at AT TIME ZONE 'America/Sao_Paulo')::date < v_hoje;
  END IF;

  -- Aluno sumido: um aviso aos 10 dias e um lembrete aos 20; volta a treinar = contador zera
  INSERT INTO assistente_alertas (tenant_id, aluno_id, aluno_nome, tipo, prioridade, titulo, detalhe, chave_dedupe)
  SELECT DISTINCT ON (a.tenant_id, a.aluno_id) a.tenant_id, a.aluno_id, p.nome_completo, 'sumindo',
         CASE WHEN (v_hoje - s.ultimo_treino) >= 20 THEN 2 ELSE 3 END,
         coalesce(nullif(split_part(coalesce(p.nome_completo,''), ' ', 1), ''), 'Aluno')
           || ' está há ' || (v_hoje - s.ultimo_treino)::text || ' dias sem treinar',
         jsonb_build_object('ultimo_treino', s.ultimo_treino, 'dias', v_hoje - s.ultimo_treino),
         'sumindo' || CASE WHEN (v_hoje - s.ultimo_treino) >= 20 THEN '20' ELSE '10' END
           || ':' || a.aluno_id::text || ':' || s.ultimo_treino::text
    FROM assinaturas a
    JOIN stats_treino_aluno s ON s.aluno_id = a.aluno_id AND s.tenant_id = a.tenant_id
    LEFT JOIN perfis p ON p.id = a.aluno_id
    LEFT JOIN assistente_config c ON c.tenant_id = a.tenant_id
   WHERE a.status IN ('active','trialing')
     AND s.ultimo_treino IS NOT NULL
     AND (v_hoje - s.ultimo_treino) BETWEEN 10 AND 60
     AND (p_tenant IS NULL OR a.tenant_id = p_tenant)
     AND coalesce((c.tipos->>'sumindo')::boolean, true)
     AND NOT EXISTS (SELECT 1 FROM assistente_alertas x
                      WHERE x.tenant_id = a.tenant_id AND x.aluno_id = a.aluno_id AND x.adiar_ate > now())
   ORDER BY a.tenant_id, a.aluno_id
  ON CONFLICT (tenant_id, chave_dedupe) DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;

  -- O lembrete de 20 dias substitui o aviso de 10
  UPDATE assistente_alertas al SET estado = 'resolvido'
   WHERE al.estado IN ('novo','visto','adiado') AND al.tipo = 'sumindo' AND al.chave_dedupe LIKE 'sumindo10:%'
     AND (p_tenant IS NULL OR al.tenant_id = p_tenant)
     AND EXISTS (SELECT 1 FROM assistente_alertas y
                  WHERE y.tenant_id = al.tenant_id AND y.aluno_id = al.aluno_id AND y.tipo = 'sumindo'
                    AND y.chave_dedupe = 'sumindo20:' || al.aluno_id::text || ':' || (al.detalhe->>'ultimo_treino'));

  -- Treinando bem menos que o normal (no máximo um aviso por mês)
  INSERT INTO assistente_alertas (tenant_id, aluno_id, aluno_nome, tipo, prioridade, titulo, detalhe, chave_dedupe)
  SELECT b.tenant_id, b.aluno_id, p.nome_completo, 'queda_frequencia', 3,
         coalesce(nullif(split_part(coalesce(p.nome_completo,''), ' ', 1), ''), 'Aluno')
           || ' está treinando bem menos que o normal',
         jsonb_build_object('treinos_14d', b.recentes, 'media_14d', round(b.anteriores / 4.0, 1), 'media_semanal', round(b.anteriores / 8.0, 1)),
         'queda:' || b.aluno_id::text || ':' || to_char(v_hoje, 'YYYY-MM')
    FROM (
      SELECT st.tenant_id, st.aluno_id,
             count(DISTINCT st.data_treino) FILTER (WHERE st.data_treino > v_hoje - 14) AS recentes,
             count(DISTINCT st.data_treino) FILTER (WHERE st.data_treino <= v_hoje - 14) AS anteriores
        FROM sessoes_treino st
       WHERE st.data_treino > v_hoje - 70 AND st.data_treino <= v_hoje
         AND (p_tenant IS NULL OR st.tenant_id = p_tenant)
       GROUP BY st.tenant_id, st.aluno_id
    ) b
    LEFT JOIN perfis p ON p.id = b.aluno_id
    LEFT JOIN assistente_config c ON c.tenant_id = b.tenant_id
   WHERE b.anteriores >= 8
     AND b.recentes > 0
     AND b.recentes <= (b.anteriores / 4.0) * 0.5
     AND coalesce((c.tipos->>'queda_frequencia')::boolean, true)
     AND EXISTS (SELECT 1 FROM assinaturas a WHERE a.aluno_id = b.aluno_id AND a.tenant_id = b.tenant_id AND a.status IN ('active','trialing'))
     AND NOT EXISTS (SELECT 1 FROM stats_treino_aluno s WHERE s.aluno_id = b.aluno_id AND s.tenant_id = b.tenant_id AND s.ultimo_treino <= v_hoje - 10)
     AND NOT EXISTS (SELECT 1 FROM assistente_alertas x
                      WHERE x.tenant_id = b.tenant_id AND x.aluno_id = b.aluno_id AND x.adiar_ate > now())
  ON CONFLICT (tenant_id, chave_dedupe) DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;

  -- Pagamento atrasado: no dia do vencimento e de novo após 3 dias
  INSERT INTO assistente_alertas (tenant_id, aluno_id, aluno_nome, tipo, prioridade, titulo, detalhe, chave_dedupe)
  SELECT pg.tenant_id, pg.aluno_id, pg.aluno_nome, 'pagamento_vencido', 1,
         coalesce(nullif(split_part(coalesce(pg.aluno_nome,''), ' ', 1), ''), 'Aluno')
           || ' está com pagamento atrasado (R$ '
           || replace(to_char(pg.valor_bruto_centavos / 100.0, 'FM999999990.00'), '.', ',') || ')',
         jsonb_build_object('pagamento_id', pg.id, 'valor_centavos', pg.valor_bruto_centavos,
                            'dias_atraso', v_hoje - coalesce(pg.data_vencimento, pg.created_at::date)),
         'venc' || CASE WHEN (v_hoje - coalesce(pg.data_vencimento, pg.created_at::date)) >= 3 THEN '3' ELSE '0' END
           || ':' || pg.id::text
    FROM pagamentos pg
    LEFT JOIN assistente_config c ON c.tenant_id = pg.tenant_id
   WHERE pg.status = 'vencido'
     AND coalesce(pg.data_vencimento, pg.created_at::date) <= v_hoje
     AND (p_tenant IS NULL OR pg.tenant_id = p_tenant)
     AND coalesce((c.tipos->>'pagamento')::boolean, true)
     AND NOT EXISTS (SELECT 1 FROM assistente_alertas x
                      WHERE x.tenant_id = pg.tenant_id AND x.aluno_id = pg.aluno_id AND x.adiar_ate > now())
  ON CONFLICT (tenant_id, chave_dedupe) DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;

  UPDATE assistente_alertas al SET estado = 'resolvido'
   WHERE al.estado IN ('novo','visto','adiado') AND al.tipo = 'pagamento_vencido' AND al.chave_dedupe LIKE 'venc0:%'
     AND (p_tenant IS NULL OR al.tenant_id = p_tenant)
     AND EXISTS (SELECT 1 FROM assistente_alertas y
                  WHERE y.tenant_id = al.tenant_id AND y.chave_dedupe = 'venc3:' || (al.detalhe->>'pagamento_id'));

  -- Renovação nos próximos 7 dias
  INSERT INTO assistente_alertas (tenant_id, aluno_id, aluno_nome, tipo, prioridade, titulo, detalhe, chave_dedupe)
  SELECT a.tenant_id, a.aluno_id, p.nome_completo, 'renovacao_proxima', 2,
         coalesce(nullif(split_part(coalesce(p.nome_completo,''), ' ', 1), ''), 'Aluno')
           || ' renova em ' || to_char(a.current_period_end AT TIME ZONE 'America/Sao_Paulo', 'DD/MM'),
         jsonb_build_object('assinatura_id', a.id, 'periodo_fim', a.current_period_end::date),
         'renov:' || a.id::text || ':' || a.current_period_end::date::text
    FROM assinaturas a
    LEFT JOIN perfis p ON p.id = a.aluno_id
    LEFT JOIN assistente_config c ON c.tenant_id = a.tenant_id
   WHERE a.status IN ('active','trialing') AND a.origem <> 'gratuito'
     AND a.current_period_end BETWEEN now() AND now() + interval '7 days'
     AND (p_tenant IS NULL OR a.tenant_id = p_tenant)
     AND coalesce((c.tipos->>'renovacao')::boolean, true)
     AND NOT EXISTS (SELECT 1 FROM assistente_alertas x
                      WHERE x.tenant_id = a.tenant_id AND x.aluno_id = a.aluno_id AND x.adiar_ate > now())
  ON CONFLICT (tenant_id, chave_dedupe) DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;

  -- Negócio: só às segundas-feiras
  IF v_segunda THEN
    FOR r IN
      SELECT t.id FROM tenants t
        LEFT JOIN assistente_config c ON c.tenant_id = t.id
       WHERE (p_tenant IS NULL OR t.id = p_tenant)
         AND coalesce((c.tipos->>'negocio')::boolean, true)
         AND (EXISTS (SELECT 1 FROM pagamentos pg WHERE pg.tenant_id = t.id)
           OR EXISTS (SELECT 1 FROM despesas d WHERE d.tenant_id = t.id)
           OR EXISTS (SELECT 1 FROM assinatura_eventos e WHERE e.tenant_id = t.id AND e.tipo = 'saiu'))
    LOOP
      SELECT * INTO f1 FROM assistente_financeiro_mes(r.id, v_m1);
      SELECT * INTO f2 FROM assistente_financeiro_mes(r.id, v_m2);

      IF (f1.receita > 0 OR f2.receita > 0 OR f1.despesas > 0 OR f2.despesas > 0)
         AND (f1.receita - f1.despesas) < (f2.receita - f2.despesas) THEN
        INSERT INTO assistente_alertas (tenant_id, tipo, prioridade, titulo, detalhe, chave_dedupe)
        VALUES (r.id, 'lucro_queda', 2,
                'Lucro caiu em ' || to_char(v_m1, 'MM/YYYY') || ': R$ '
                  || replace(to_char((f1.receita - f1.despesas) / 100.0, 'FM999999990.00'), '.', ',')
                  || ' (antes R$ ' || replace(to_char((f2.receita - f2.despesas) / 100.0, 'FM999999990.00'), '.', ',') || ')',
                jsonb_build_object('mes', v_m1, 'lucro', f1.receita - f1.despesas, 'lucro_anterior', f2.receita - f2.despesas),
                'lucro:' || to_char(v_m1, 'YYYY-MM'))
        ON CONFLICT (tenant_id, chave_dedupe) DO NOTHING;
        GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;
      END IF;

      SELECT count(DISTINCT aluno_id) FILTER (WHERE ocorreu_em >= now() - interval '30 days'),
             count(DISTINCT aluno_id) FILTER (WHERE ocorreu_em < now() - interval '30 days')
        INTO v_saidas_rec, v_saidas_ant
        FROM assinatura_eventos
       WHERE tenant_id = r.id AND tipo = 'saiu' AND ocorreu_em >= now() - interval '60 days';
      IF v_saidas_rec >= 2 AND v_saidas_rec > v_saidas_ant THEN
        INSERT INTO assistente_alertas (tenant_id, tipo, prioridade, titulo, detalhe, chave_dedupe)
        VALUES (r.id, 'retencao_queda', 2,
                'Mais alunos saindo: ' || v_saidas_rec || ' nos últimos 30 dias (antes: ' || v_saidas_ant || ')',
                jsonb_build_object('saidas_30d', v_saidas_rec, 'saidas_30d_anterior', v_saidas_ant),
                'retencao:' || to_char(v_hoje, 'IYYY-IW'))
        ON CONFLICT (tenant_id, chave_dedupe) DO NOTHING;
        GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;
      END IF;

      IF f1.captacao > 0 AND f1.ticket > 0 THEN
        SELECT count(DISTINCT e.aluno_id) INTO v_novos
          FROM assinatura_eventos e
         WHERE e.tenant_id = r.id AND e.tipo = 'entrou'
           AND date_trunc('month', e.ocorreu_em AT TIME ZONE 'America/Sao_Paulo')::date = v_m1
           AND EXISTS (SELECT 1 FROM pagamentos pg WHERE pg.tenant_id = r.id AND pg.aluno_id = e.aluno_id AND pg.status = 'pago');
        IF v_novos > 0 THEN
          v_cac := f1.captacao / v_novos;
          IF v_cac > f1.ticket THEN
            INSERT INTO assistente_alertas (tenant_id, tipo, prioridade, titulo, detalhe, chave_dedupe)
            VALUES (r.id, 'cac_alto', 2,
                    'Trazer cada aluno custou R$ ' || replace(to_char(v_cac / 100.0, 'FM999999990.00'), '.', ',')
                      || ', acima do ticket médio (R$ ' || replace(to_char(f1.ticket / 100.0, 'FM999999990.00'), '.', ',') || ')',
                    jsonb_build_object('mes', v_m1, 'cac', v_cac, 'ticket', f1.ticket, 'novos', v_novos),
                    'cac:' || to_char(v_m1, 'YYYY-MM'))
            ON CONFLICT (tenant_id, chave_dedupe) DO NOTHING;
            GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;

  DELETE FROM assistente_alertas
   WHERE created_at < now() - interval '90 days' AND estado IN ('resolvido','dispensado');

  RETURN v_total;
END $function$;
REVOKE ALL ON FUNCTION public.gerar_alertas_assistente(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_alertas_assistente(uuid) TO service_role;

-- Disparo do resumo da manhã (chamado de hora em hora, das 7h às 20h de Brasília)
CREATE OR REPLACE FUNCTION public.disparar_resumo_assistente()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'vault'
AS $$
DECLARE
  v_service_key text;
BEGIN
  SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets
   WHERE name = 'project_service_role_key' LIMIT 1;
  IF v_service_key IS NULL THEN
    RAISE WARNING 'project_service_role_key not configured in Vault';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := 'https://iflgryuemsohurtdaawm.supabase.co/functions/v1/assistente-resumo',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_service_key),
    body := '{}'::jsonb
  );
END $$;
REVOKE ALL ON FUNCTION public.disparar_resumo_assistente() FROM PUBLIC, anon, authenticated;