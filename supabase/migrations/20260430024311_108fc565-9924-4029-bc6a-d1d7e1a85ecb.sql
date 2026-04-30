INSERT INTO public.user_roles (user_id, role, tenant_id)
VALUES ('3c40d11c-1560-462f-8918-a924cfe8686c', 'admin', NULL)
ON CONFLICT DO NOTHING;