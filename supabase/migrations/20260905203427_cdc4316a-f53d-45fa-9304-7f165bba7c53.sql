ALTER TABLE public.treinos_prescritos ADD COLUMN IF NOT EXISTS tecnica_avancada text;

ALTER TABLE public.dicionario_tecnicas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

GRANT SELECT ON public.dicionario_tecnicas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dicionario_tecnicas TO authenticated;
GRANT ALL ON public.dicionario_tecnicas TO service_role;

DROP POLICY IF EXISTS "tecnicas_manage_coach" ON public.dicionario_tecnicas;
CREATE POLICY "tecnicas_manage_coach" ON public.dicionario_tecnicas
FOR ALL TO authenticated
USING (tenant_id IS NOT NULL AND (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin')))
WITH CHECK (tenant_id IS NOT NULL AND (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin')));

CREATE TABLE IF NOT EXISTS public.biblioteca_assuntos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  categoria text NOT NULL DEFAULT 'Geral',
  capa_url text,
  descricao text,
  conteudo_texto text,
  pdf_url text,
  youtube_url text,
  video_url text,
  ordem integer NOT NULL DEFAULT 0,
  publicado boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.biblioteca_assuntos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_assuntos TO authenticated;
GRANT ALL ON public.biblioteca_assuntos TO service_role;

ALTER TABLE public.biblioteca_assuntos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biblioteca_select_tenant" ON public.biblioteca_assuntos
FOR SELECT USING (
  (publicado AND public.user_belongs_to_tenant(auth.uid(), tenant_id))
  OR public.has_role(auth.uid(), 'coach', tenant_id)
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "biblioteca_manage_coach" ON public.biblioteca_assuntos
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_biblioteca_assuntos_tenant ON public.biblioteca_assuntos(tenant_id, categoria, ordem);

DROP TRIGGER IF EXISTS trg_biblioteca_assuntos_updated_at ON public.biblioteca_assuntos;
CREATE TRIGGER trg_biblioteca_assuntos_updated_at
BEFORE UPDATE ON public.biblioteca_assuntos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();