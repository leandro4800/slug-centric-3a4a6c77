CREATE TABLE public.vips_plataforma (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX vips_plataforma_email_key ON public.vips_plataforma (lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vips_plataforma TO authenticated;
GRANT ALL ON public.vips_plataforma TO service_role;

ALTER TABLE public.vips_plataforma ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plataforma gerencia vips"
ON public.vips_plataforma
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.slug = 'alphateam' AND t.owner_user_id = auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.slug = 'alphateam' AND t.owner_user_id = auth.uid())
);

CREATE TRIGGER vips_plataforma_updated_at
BEFORE UPDATE ON public.vips_plataforma
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();