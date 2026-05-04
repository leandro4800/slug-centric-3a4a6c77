
-- Add read policies for pacho reference tables (static data, no PII)
CREATE POLICY "pacho_metodologia_read" ON public.biblioteca_metodologia_pacho FOR SELECT TO authenticated USING (true);
CREATE POLICY "pacho_mobilidade_read" ON public.biblioteca_mobilidade_pacho FOR SELECT TO authenticated USING (true);
CREATE POLICY "pacho_abdominais_read" ON public.biblioteca_abdominais_pacho FOR SELECT TO authenticated USING (true);
CREATE POLICY "pacho_volume_read" ON public.regras_volume_pacho FOR SELECT TO authenticated USING (true);
CREATE POLICY "pacho_descanso_read" ON public.regras_descanso_pacho FOR SELECT TO authenticated USING (true);
CREATE POLICY "pacho_config_read" ON public.metodologia_pacho_config FOR SELECT TO authenticated USING (true);

-- Revoke execute from internal trigger functions (they only need to run as triggers, not via API)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.auto_activate_vip_subscription() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_perfil_treino_from_avaliacao() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_tenants_to_private() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_private_to_tenants() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon, authenticated, public;
