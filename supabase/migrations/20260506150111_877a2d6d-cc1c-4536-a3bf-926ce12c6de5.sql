
-- Slots de horários disponíveis para aulas avulsas
CREATE TABLE public.agenda_aula_avulsa_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  capacidade INTEGER NOT NULL DEFAULT 1,
  reservados INTEGER NOT NULL DEFAULT 0,
  local TEXT,
  link_online TEXT,
  observacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_slots_tenant_data ON public.agenda_aula_avulsa_slots(tenant_id, data);

ALTER TABLE public.agenda_aula_avulsa_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slots_select_public" ON public.agenda_aula_avulsa_slots
  FOR SELECT USING (true);

CREATE POLICY "slots_manage_owner" ON public.agenda_aula_avulsa_slots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER slots_updated_at BEFORE UPDATE ON public.agenda_aula_avulsa_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Agendamentos de aula avulsa
CREATE TABLE public.agendamentos_aula_avulsa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  slot_id UUID REFERENCES public.agenda_aula_avulsa_slots(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  valor_centavos INTEGER,
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente | pago | confirmado | cancelado
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agend_tenant ON public.agendamentos_aula_avulsa(tenant_id);
CREATE INDEX idx_agend_slot ON public.agendamentos_aula_avulsa(slot_id);

ALTER TABLE public.agendamentos_aula_avulsa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agend_owner_view" ON public.agendamentos_aula_avulsa
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "agend_owner_update" ON public.agendamentos_aula_avulsa
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER agend_updated_at BEFORE UPDATE ON public.agendamentos_aula_avulsa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
