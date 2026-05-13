-- Drop existing narrow policy
DROP POLICY IF EXISTS "perfis_select_own" ON public.perfis;

-- Create a more inclusive policy for community features
-- Allows:
-- 1. Seeing your own profile
-- 2. Admins seeing everyone
-- 3. Coaches seeing their own students
-- 4. Students seeing other students from the same tenant (needed for community names/photos)
CREATE POLICY "perfis_select_all_in_tenant" ON public.perfis
FOR SELECT
USING (
  auth.uid() = id 
  OR 
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  (tenant_id IS NOT NULL AND tenant_id IN (
    SELECT p.tenant_id FROM public.perfis p WHERE p.id = auth.uid()
  ))
);