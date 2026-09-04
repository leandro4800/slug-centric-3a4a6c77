CREATE UNIQUE INDEX IF NOT EXISTS series_executadas_sessao_exercicio_serie_uidx
  ON public.series_executadas (sessao_id, treino_prescrito_id, numero_serie)
  NULLS NOT DISTINCT;

REVOKE ALL ON FUNCTION public.replace_replayed_series_executadas() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_replayed_series_executadas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_replayed_series_executadas() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_replayed_series_executadas() TO service_role;