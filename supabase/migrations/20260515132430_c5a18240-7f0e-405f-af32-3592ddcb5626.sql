GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role, uuid) TO anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.current_user_tenant() TO anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_tenant(uuid, uuid) TO anon, authenticated, public;