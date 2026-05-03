
GRANT SELECT, INSERT, UPDATE ON public.tenants TO authenticated;
GRANT SELECT ON public.tenants TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants_private TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos TO authenticated;
GRANT SELECT ON public.planos TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
