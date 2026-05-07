UPDATE public.tenants
SET status = 'approved'::public.tenant_status
WHERE slug = 'metodojackson'
  AND status <> 'approved'::public.tenant_status;