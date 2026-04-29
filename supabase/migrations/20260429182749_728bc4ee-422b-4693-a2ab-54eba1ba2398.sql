-- Fix Search Path for trigger and helper functions
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.current_user_tenant() SET search_path = public;
ALTER FUNCTION public.has_role(uuid, public.app_role, uuid) SET search_path = public;
