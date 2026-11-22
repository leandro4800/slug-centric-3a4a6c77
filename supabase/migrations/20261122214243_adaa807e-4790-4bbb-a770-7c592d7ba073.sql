CREATE OR REPLACE FUNCTION public.limpar_sessoes_treino_invalidas()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN 0;
  END IF;
  UPDATE public.sessoes_treino s
     SET cancelada_em = now()
   WHERE s.aluno_id = v_uid
     AND s.duracao_min = 0
     AND s.cancelada_em IS NULL
     AND (
       s.created_at < now() - interval '12 hours'
       OR EXISTS (
         SELECT 1 FROM public.sessoes_treino c
          WHERE c.aluno_id = s.aluno_id
            AND c.tenant_id IS NOT DISTINCT FROM s.tenant_id
            AND c.dia_semana IS NOT DISTINCT FROM s.dia_semana
            AND c.duracao_min > 0
            AND c.cancelada_em IS NULL
            AND c.id <> s.id
            AND date_trunc('week', c.data_treino::timestamp) = date_trunc('week', s.data_treino::timestamp)
       )
     );
  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN v_total;
END;
$$;

ALTER FUNCTION public.iniciar_sessao_treino(uuid, text, integer) SECURITY INVOKER;
ALTER FUNCTION public.cancelar_sessao_treino(uuid) SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.limpar_sessoes_treino_invalidas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.limpar_sessoes_treino_invalidas() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.iniciar_sessao_treino(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_sessao_treino(uuid, text, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.cancelar_sessao_treino(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_sessao_treino(uuid) TO authenticated;