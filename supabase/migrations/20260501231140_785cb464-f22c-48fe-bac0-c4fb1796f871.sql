-- Atualizar o Plano Alpha Elite
UPDATE public.planos 
SET 
  preco_centavos = 2990,
  stripe_product_id = 'prod_URIjYTDivrIaId',
  stripe_price_id = 'price_1TSQ7g5cCGgymbBEcoSLIROP'
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Garantir que o usuário executionmode48@gmail.com tenha uma assinatura ativa
DO $$
DECLARE
    u_id UUID;
    t_id UUID := '6c4ff89c-3d9f-4225-ae95-5bf1dbf35886';
    p_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    SELECT id INTO u_id FROM auth.users WHERE email = 'executionmode48@gmail.com';
    
    IF u_id IS NOT NULL THEN
        INSERT INTO public.assinaturas (
            aluno_id,
            plano_id,
            tenant_id,
            status,
            current_period_end
        )
        VALUES (
            u_id,
            p_id,
            t_id,
            'active',
            now() + interval '100 years'
        )
        ON CONFLICT ON CONSTRAINT unique_aluno_tenant_subscription DO UPDATE 
        SET status = 'active', current_period_end = now() + interval '100 years';
    END IF;
END $$;
