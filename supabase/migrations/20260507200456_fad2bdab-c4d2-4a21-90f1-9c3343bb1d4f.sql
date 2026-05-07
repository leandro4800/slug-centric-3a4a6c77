UPDATE public.vlog_posts
SET visivel = true,
    title = NULL
WHERE tenant_id = 'ca38c1a1-06b8-4549-9bfa-f06603ac08e9';

UPDATE public.tenants
SET logo_url = '/tenants/metodojackson/logo.png',
    symbol_url = '/tenants/metodojackson/logo.png'
WHERE id = 'ca38c1a1-06b8-4549-9bfa-f06603ac08e9';