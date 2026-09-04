ALTER TABLE public.series_executadas ADD COLUMN IF NOT EXISTS exercicio_chave text;

DROP INDEX IF EXISTS public.series_executadas_sessao_exercicio_serie_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS series_executadas_sessao_exercicio_serie_uidx
  ON public.series_executadas (sessao_id, treino_prescrito_id, exercicio_chave, numero_serie)
  NULLS NOT DISTINCT;

CREATE OR REPLACE FUNCTION public.replace_replayed_series_executadas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_had_record boolean;
BEGIN
  SELECT COALESCE(bool_or(s.is_recorde), false)
    INTO v_had_record
  FROM public.series_executadas s
  WHERE s.sessao_id IS NOT DISTINCT FROM NEW.sessao_id
    AND s.treino_prescrito_id IS NOT DISTINCT FROM NEW.treino_prescrito_id
    AND s.exercicio_chave IS NOT DISTINCT FROM NEW.exercicio_chave
    AND s.numero_serie = NEW.numero_serie;

  UPDATE public.prs p
  SET series_executada_id = NULL
  FROM public.series_executadas old
  WHERE old.sessao_id IS NOT DISTINCT FROM NEW.sessao_id
    AND old.treino_prescrito_id IS NOT DISTINCT FROM NEW.treino_prescrito_id
    AND old.exercicio_chave IS NOT DISTINCT FROM NEW.exercicio_chave
    AND old.numero_serie = NEW.numero_serie
    AND p.series_executada_id = old.id;

  DELETE FROM public.series_executadas old
  WHERE old.sessao_id IS NOT DISTINCT FROM NEW.sessao_id
    AND old.treino_prescrito_id IS NOT DISTINCT FROM NEW.treino_prescrito_id
    AND old.exercicio_chave IS NOT DISTINCT FROM NEW.exercicio_chave
    AND old.numero_serie = NEW.numero_serie;

  NEW.is_recorde := COALESCE(NEW.is_recorde, false) OR COALESCE(v_had_record, false);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_replayed_series_executadas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_replayed_series_executadas() TO service_role;