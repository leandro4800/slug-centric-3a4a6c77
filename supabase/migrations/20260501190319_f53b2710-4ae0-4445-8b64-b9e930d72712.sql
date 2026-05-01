INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status)
SELECT id, tenant_id, '11111111-1111-1111-1111-111111111111', 'active'
FROM public.perfis
WHERE tenant_id = '6c4ff89c-3d9f-4225-ae95-5bf1dbf35886'
ON CONFLICT DO NOTHING;