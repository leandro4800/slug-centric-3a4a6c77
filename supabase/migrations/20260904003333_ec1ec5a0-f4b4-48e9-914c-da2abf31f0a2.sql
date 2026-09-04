DROP INDEX IF EXISTS public.series_executadas_sessao_exercicio_serie_uidx;

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

  NEW.is_recorde := COALESCE(NEW.is_recorde, false) OR COALESCE(v_had_record, false);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_replayed_series_executadas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.prs p
  SET series_executada_id = NEW.id
  FROM public.series_executadas old
  WHERE old.id <> NEW.id
    AND old.sessao_id IS NOT DISTINCT FROM NEW.sessao_id
    AND old.treino_prescrito_id IS NOT DISTINCT FROM NEW.treino_prescrito_id
    AND old.numero_serie = NEW.numero_serie
    AND p.series_executada_id = old.id;

  DELETE FROM public.series_executadas old
  WHERE old.id <> NEW.id
    AND old.sessao_id IS NOT DISTINCT FROM NEW.sessao_id
    AND old.treino_prescrito_id IS NOT DISTINCT FROM NEW.treino_prescrito_id
    AND old.numero_serie = NEW.numero_serie;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_replace_replayed_series_before ON public.series_executadas;
CREATE TRIGGER trg_replace_replayed_series_before
BEFORE INSERT ON public.series_executadas
FOR EACH ROW
EXECUTE FUNCTION public.replace_replayed_series_executadas();

DROP TRIGGER IF EXISTS trg_cleanup_replayed_series_after ON public.series_executadas;
CREATE TRIGGER trg_cleanup_replayed_series_after
AFTER INSERT ON public.series_executadas
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_replayed_series_executadas();