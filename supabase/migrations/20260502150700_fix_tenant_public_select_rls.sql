-- Split tenant read policies so anonymous/public tenant loading never calls has_role.
-- This prevents permission errors during branding/public route resolution while keeping admin checks authenticated-only.

DROP POLICY IF EXISTS tenants_select_public ON public.tenants;
DROP POLICY IF EXISTS tenants_admin_all ON public.tenants;
DROP POLICY IF EXISTS tenants_update_owner ON public.tenants;

CREATE POLICY tenants_select_approved_public
ON public.tenants
FOR SELECT
TO anon, authenticated
USING (status = 'approved'::tenant_status);

CREATE POLICY tenants_select_owner_admin
ON public.tenants
FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY tenants_update_owner
ON public.tenants
FOR UPDATE
TO authenticated
USING (
  auth.uid() = owner_user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = owner_user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY tenants_admin_all
ON public.tenants
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
