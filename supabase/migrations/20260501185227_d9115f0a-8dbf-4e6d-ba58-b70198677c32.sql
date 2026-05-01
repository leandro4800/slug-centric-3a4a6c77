-- Insert a plan for Alpha Coach (Alphateam)
INSERT INTO public.planos (id, tenant_id, nome, descricao, preco_centavos, intervalo, ativo, ordem)
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  '6c4ff89c-3d9f-4225-ae95-5bf1dbf35886', 
  'Plano Alpha Elite', 
  'Acesso total aos treinos e acompanhamento personalizado.', 
  19990, 
  'mensal', 
  true, 
  0
) ON CONFLICT (id) DO NOTHING;

-- Link the student "Execution Mode" to this plan
INSERT INTO public.assinaturas (id, aluno_id, tenant_id, plano_id, status)
VALUES (
  gen_random_uuid(),
  '9dc99d9f-0e26-479b-a8ff-e0181a90c872',
  '6c4ff89c-3d9f-4225-ae95-5bf1dbf35886',
  '11111111-1111-1111-1111-111111111111',
  'active'
) ON CONFLICT DO NOTHING;