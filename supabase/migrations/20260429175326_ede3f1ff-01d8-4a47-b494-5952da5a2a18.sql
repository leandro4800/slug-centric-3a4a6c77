-- Revoga execução pública das funções SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_tenant() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_tenant() TO authenticated;

-- Endurece policy de leads: exige email não-vazio e formato básico
DROP POLICY IF EXISTS "leads_insert_public" ON public.leads;
CREATE POLICY "leads_insert_public" ON public.leads FOR INSERT
  WITH CHECK (
    email IS NOT NULL
    AND length(trim(email)) > 3
    AND email LIKE '%_@_%.__%'
  );