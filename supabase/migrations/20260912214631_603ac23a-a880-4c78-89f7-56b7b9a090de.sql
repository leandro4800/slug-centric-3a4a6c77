CREATE TABLE public.avaliacoes_posturais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  aluno_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  foto_frontal_path text NOT NULL,
  foto_posterior_path text NOT NULL,
  foto_lateral_path text NOT NULL,
  resultado_json jsonb,
  status text NOT NULL DEFAULT 'concluido',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes_posturais TO authenticated;
GRANT ALL ON public.avaliacoes_posturais TO service_role;

ALTER TABLE public.avaliacoes_posturais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno gerencia suas analises posturais"
ON public.avaliacoes_posturais FOR ALL TO authenticated
USING (auth.uid() = aluno_id) WITH CHECK (auth.uid() = aluno_id);

CREATE POLICY "Coach do tenant ve analises posturais"
ON public.avaliacoes_posturais FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = avaliacoes_posturais.tenant_id AND ur.role IN ('coach','admin')))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = avaliacoes_posturais.tenant_id AND ur.role IN ('coach','admin')));

CREATE INDEX idx_avaliacoes_posturais_aluno ON public.avaliacoes_posturais (aluno_id, created_at DESC);

CREATE TRIGGER update_avaliacoes_posturais_updated_at
BEFORE UPDATE ON public.avaliacoes_posturais
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();