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
    AND s.numero_serie = NEW.numero_serie;

  UPDATE public.prs p
  SET series_executada_id = NULL
  FROM public.series_executadas old
  WHERE old.sessao_id IS NOT DISTINCT FROM NEW.sessao_id
    AND old.treino_prescrito_id IS NOT DISTINCT FROM NEW.treino_prescrito_id
    AND old.numero_serie = NEW.numero_serie
    AND p.series_executada_id = old.id;

  DELETE FROM public.series_executadas old
  WHERE old.sessao_id IS NOT DISTINCT FROM NEW.sessao_id
    AND old.treino_prescrito_id IS NOT DISTINCT FROM NEW.treino_prescrito_id
    AND old.numero_serie = NEW.numero_serie;

  NEW.is_recorde := COALESCE(NEW.is_recorde, false) OR COALESCE(v_had_record, false);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_replayed_series_after ON public.series_executadas;
DROP FUNCTION IF EXISTS public.cleanup_replayed_series_executadas();

REVOKE ALL ON FUNCTION public.replace_replayed_series_executadas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_replayed_series_executadas() TO service_role;