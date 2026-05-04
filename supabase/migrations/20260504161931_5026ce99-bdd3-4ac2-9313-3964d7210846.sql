
CREATE TABLE IF NOT EXISTS public.parceiros (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cupom text,
  url text,
  logo_url text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parceiros_tenant ON public.parceiros(tenant_id, ordem);

ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parceiros are viewable by everyone"
ON public.parceiros FOR SELECT
USING (true);

CREATE POLICY "Coaches can insert their parceiros"
ON public.parceiros FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'coach'::app_role, tenant_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coaches can update their parceiros"
ON public.parceiros FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'coach'::app_role, tenant_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coaches can delete their parceiros"
ON public.parceiros FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'coach'::app_role, tenant_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER parceiros_updated_at
BEFORE UPDATE ON public.parceiros
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
