
CREATE TABLE public.cartas_atleta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL UNIQUE,
  tenant_id uuid NOT NULL,
  avatar_carta_url text,
  foto_original_url text,
  posicao text NOT NULL DEFAULT 'ATA',
  numero integer NOT NULL DEFAULT 10,
  nivel integer NOT NULL DEFAULT 75,
  atributos jsonb NOT NULL DEFAULT '{"forca":70,"hipertrofia":70,"resistencia":70,"mobilidade":70,"disciplina":70,"recuperacao":70}'::jsonb,
  estilo_dominante text DEFAULT 'Virtuoso',
  estilo_secundario text DEFAULT 'Heartbeat',
  bio text,
  conquistas jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cartas_atleta ENABLE ROW LEVEL SECURITY;

CREATE POLICY cartas_select ON public.cartas_atleta FOR SELECT
USING (
  aluno_id = auth.uid()
  OR EXISTS (SELECT 1 FROM tenants t WHERE t.id = cartas_atleta.tenant_id AND t.owner_user_id = auth.uid())
  OR has_role(auth.uid(), 'coach'::app_role, tenant_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY cartas_insert ON public.cartas_atleta FOR INSERT
WITH CHECK (
  aluno_id = auth.uid()
  OR EXISTS (SELECT 1 FROM tenants t WHERE t.id = cartas_atleta.tenant_id AND t.owner_user_id = auth.uid())
  OR has_role(auth.uid(), 'coach'::app_role, tenant_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY cartas_update ON public.cartas_atleta FOR UPDATE
USING (
  aluno_id = auth.uid()
  OR EXISTS (SELECT 1 FROM tenants t WHERE t.id = cartas_atleta.tenant_id AND t.owner_user_id = auth.uid())
  OR has_role(auth.uid(), 'coach'::app_role, tenant_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE TRIGGER cartas_atleta_updated_at
BEFORE UPDATE ON public.cartas_atleta
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
