CREATE TABLE public.dicionario_tecnicas_ocultas (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tecnica_id uuid NOT NULL REFERENCES public.dicionario_tecnicas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, tecnica_id)
);

GRANT SELECT, INSERT, DELETE ON public.dicionario_tecnicas_ocultas TO authenticated;
GRANT ALL ON public.dicionario_tecnicas_ocultas TO service_role;

ALTER TABLE public.dicionario_tecnicas_ocultas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tecnicas_ocultas_manage_coach"
ON public.dicionario_tecnicas_ocultas
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));