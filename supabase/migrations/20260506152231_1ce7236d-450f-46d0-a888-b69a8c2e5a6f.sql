-- Adiciona índice para busca por email e tenant
CREATE INDEX IF NOT EXISTS idx_agendamentos_aula_avulsa_email_tenant ON public.agendamentos_aula_avulsa(email, tenant_id);

-- Opcional: Limpeza de agendamentos muito antigos ou duplicados se necessário, 
-- mas por enquanto vamos apenas garantir o índice para performance.
