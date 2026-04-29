-- Atribui papel de super admin (global, sem tenant) ao usuário alphacoachapp@gmail.com
INSERT INTO public.user_roles (user_id, role, tenant_id)
VALUES ('0cd4ba57-51d8-4223-adcb-1c1fedebc90a', 'admin', NULL)
ON CONFLICT DO NOTHING;