-- Restaurar o owner original do alphapro
UPDATE public.tenants
SET owner_user_id = '600ce993-9f49-44fb-b0d1-9dbcba4094d8'
WHERE slug = 'alphapro';

-- Remover qualquer role de coach vinculada ao Armando no tenant alphapro
DELETE FROM public.user_roles 
WHERE user_id = 'c4d13a53-e135-45f1-b0e9-6404cef72ce0' 
AND tenant_id = (SELECT id FROM public.tenants WHERE slug = 'alphapro');
