INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'alphacoachapp@gmail.com'
ON CONFLICT DO NOTHING;