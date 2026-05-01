-- Função para auto-ativar assinaturas para emails vips
CREATE OR REPLACE FUNCTION public.auto_activate_vip_subscription()
RETURNS TRIGGER AS $$
DECLARE
    t_id UUID := '6c4ff89c-3d9f-4225-ae95-5bf1dbf35886'; -- Alphacoach tenant
    p_id UUID := '11111111-1111-1111-1111-111111111111'; -- Plano Alpha Elite
BEGIN
    IF NEW.email IN ('laenderfelip@gmail.com', 'executionmode48@gmail.com') THEN
        INSERT INTO public.assinaturas (
            aluno_id,
            plano_id,
            tenant_id,
            status,
            current_period_end
        )
        VALUES (
            NEW.id,
            p_id,
            t_id,
            'active',
            now() + interval '100 years'
        )
        ON CONFLICT ON CONSTRAINT unique_aluno_tenant_subscription DO UPDATE 
        SET status = 'active', current_period_end = now() + interval '100 years';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger no auth.users não é possível diretamente via migração de forma simples se não tivermos permissão, 
-- mas podemos usar a tabela de perfis (se ela for criada via trigger do auth.users)
-- Como a tabela 'perfis' existe e provavelmente é preenchida por um trigger do auth.users, vamos colocar o trigger lá.

DROP TRIGGER IF EXISTS tr_auto_activate_vip ON public.perfis;
CREATE TRIGGER tr_auto_activate_vip
AFTER INSERT ON public.perfis
FOR EACH ROW
EXECUTE FUNCTION public.auto_activate_vip_subscription();
