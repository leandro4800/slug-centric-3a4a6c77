-- Slots de agenda presencial criados pelo coach
CREATE TABLE public.agenda_presencial_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  data date NOT NULL,
  hora_inicio time NOT NULL,
  hora_fim time NOT NULL,
  local_nome text NOT NULL DEFAULT 'CT Alpha Coach',
  local_endereco text,
  local_lat numeric,
  local_lng numeric,
  capacidade int NOT NULL DEFAULT 1,
  reservados int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_aps_tenant_data ON public.agenda_presencial_slots(tenant_id, data);

-- Agendamentos presenciais
CREATE TABLE public.agendamentos_presenciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL,
  slot_id uuid NOT NULL REFERENCES public.agenda_presencial_slots(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'confirmado',
  observacoes text,
  notificado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(aluno_id, slot_id)
);
CREATE INDEX idx_agp_tenant ON public.agendamentos_presenciais(tenant_id);
CREATE INDEX idx_agp_aluno ON public.agendamentos_presenciais(aluno_id);

ALTER TABLE public.agenda_presencial_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos_presenciais ENABLE ROW LEVEL SECURITY;

-- Slots: alunos do tenant veem ativos
CREATE POLICY "Alunos do tenant veem slots ativos"
  ON public.agenda_presencial_slots FOR SELECT
  USING (ativo = true AND public.user_belongs_to_tenant(auth.uid(), tenant_id));

-- Coach (owner) gerencia tudo
CREATE POLICY "Coach gerencia slots do seu tenant"
  ON public.agenda_presencial_slots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid()));

-- Agendamentos: aluno vê e gerencia os próprios
CREATE POLICY "Aluno vê próprios agendamentos"
  ON public.agendamentos_presenciais FOR SELECT
  USING (aluno_id = auth.uid());

CREATE POLICY "Aluno cria próprios agendamentos"
  ON public.agendamentos_presenciais FOR INSERT
  WITH CHECK (aluno_id = auth.uid() AND public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Aluno atualiza próprios agendamentos"
  ON public.agendamentos_presenciais FOR UPDATE
  USING (aluno_id = auth.uid());

CREATE POLICY "Aluno deleta próprios agendamentos"
  ON public.agendamentos_presenciais FOR DELETE
  USING (aluno_id = auth.uid());

-- Coach vê e gerencia agendamentos do seu tenant
CREATE POLICY "Coach gerencia agendamentos do seu tenant"
  ON public.agendamentos_presenciais FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid()));

-- Trigger updated_at
CREATE TRIGGER trg_aps_updated BEFORE UPDATE ON public.agenda_presencial_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_agp_updated BEFORE UPDATE ON public.agendamentos_presenciais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger contador de reservados
CREATE OR REPLACE FUNCTION public.tg_atualiza_reservados_presencial()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.agenda_presencial_slots SET reservados = reservados + 1 WHERE id = NEW.slot_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.agenda_presencial_slots SET reservados = GREATEST(0, reservados - 1) WHERE id = OLD.slot_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_agp_reservados
  AFTER INSERT OR DELETE ON public.agendamentos_presenciais
  FOR EACH ROW EXECUTE FUNCTION public.tg_atualiza_reservados_presencial();