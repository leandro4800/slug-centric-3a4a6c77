-- Link the admin profile to the demo tenant
UPDATE public.perfis 
SET tenant_id = '305ebb8b-bb49-4cc0-a4d8-c4af5455f363'
WHERE email = 'alphacoachapp@gmail.com';

-- Ensure the admin has explicit coach role for the demo tenant too
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'coach', '305ebb8b-bb49-4cc0-a4d8-c4af5455f363'
FROM public.perfis
WHERE email = 'alphacoachapp@gmail.com'
ON CONFLICT DO NOTHING;

-- Also add admin role for the demo tenant specifically
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'admin', '305ebb8b-bb49-4cc0-a4d8-c4af5455f363'
FROM public.perfis
WHERE email = 'alphacoachapp@gmail.com'
ON CONFLICT DO NOTHING;
