CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfis p
    WHERE p.id = _user_id
      AND p.tenant_id = _tenant_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.user_belongs_to_tenant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_tenant(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_active_subscription_for_tenant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription_for_tenant(uuid, uuid) TO authenticated;

CREATE POLICY "tenants_select_profile_members"
ON public.tenants
FOR SELECT
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), id));