REVOKE ALL ON FUNCTION public.normalize_alphateam_ppl_weekdays() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_alphateam_ppl_weekdays() TO service_role;