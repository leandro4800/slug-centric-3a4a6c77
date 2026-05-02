
REVOKE EXECUTE ON FUNCTION public.auto_activate_vip_subscription() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_perfil_treino_from_avaliacao() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_tenants_to_private() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_private_to_tenants() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_user_tenant() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.buscar_templates_treino(text, text, integer, text, text, uuid, integer) FROM anon, public;
