CREATE OR REPLACE FUNCTION public.has_active_subscription_for_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assinaturas a
    WHERE a.aluno_id = _user_id
      AND a.tenant_id = _tenant_id
      AND a.status IN ('active', 'trialing')
  );
$$;

DROP POLICY IF EXISTS "tenants_select_active_subscribers" ON public.tenants;

CREATE POLICY "tenants_select_active_subscribers"
ON public.tenants
FOR SELECT
TO authenticated
USING (public.has_active_subscription_for_tenant(auth.uid(), id));
