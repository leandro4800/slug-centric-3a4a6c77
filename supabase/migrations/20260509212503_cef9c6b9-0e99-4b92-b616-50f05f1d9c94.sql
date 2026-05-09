
-- 1. Vouchers: restrict SELECT to tenant owner / admin (redeem still works via SECURITY DEFINER function)
DROP POLICY IF EXISTS "vouchers_select_any_auth" ON public.vouchers;

CREATE POLICY "vouchers_select_owner" ON public.vouchers
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = vouchers.tenant_id AND t.owner_user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 2. Parceiros: tenant-scoped SELECT
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.parceiros'::regclass
      AND polcmd = 'r'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.parceiros', pol.polname);
  END LOOP;
END $$;

CREATE POLICY "parceiros_select_tenant" ON public.parceiros
FOR SELECT TO authenticated
USING (
  tenant_id = public.current_user_tenant()
  OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = parceiros.tenant_id AND t.owner_user_id = auth.uid())
  OR public.has_role(auth.uid(), 'coach'::public.app_role, parceiros.tenant_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
