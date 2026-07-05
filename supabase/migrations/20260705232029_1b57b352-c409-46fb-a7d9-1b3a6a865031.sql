
ALTER TABLE public.tenants_private ADD COLUMN IF NOT EXISTS mcp_token text UNIQUE;
UPDATE public.tenants_private SET mcp_token = gen_random_uuid()::text WHERE mcp_token IS NULL;
ALTER TABLE public.tenants_private ALTER COLUMN mcp_token SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.tenants_private ALTER COLUMN mcp_token SET NOT NULL;

-- Ensure every existing tenant has a tenants_private row with a token
INSERT INTO public.tenants_private (tenant_id, mcp_token)
SELECT t.id, gen_random_uuid()::text
FROM public.tenants t
LEFT JOIN public.tenants_private tp ON tp.tenant_id = t.id
WHERE tp.tenant_id IS NULL;
