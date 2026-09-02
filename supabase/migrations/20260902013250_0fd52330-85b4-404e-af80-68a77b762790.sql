CREATE TABLE public.alunos_pendentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  plano_id uuid REFERENCES public.planos(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'convidado',
  convite_enviado_em timestamptz,
  convertido_em timestamptz,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX alunos_pendentes_tenant_email_key
  ON public.alunos_pendentes (tenant_id, lower(email));
CREATE INDEX alunos_pendentes_email_idx ON public.alunos_pendentes (lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alunos_pendentes TO authenticated;
GRANT ALL ON public.alunos_pendentes TO service_role;

ALTER TABLE public.alunos_pendentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own tenant invites"
ON public.alunos_pendentes
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach', tenant_id)
  OR public.has_role(auth.uid(), 'admin', tenant_id)
  OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = alunos_pendentes.tenant_id AND t.owner_user_id = auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'coach', tenant_id)
  OR public.has_role(auth.uid(), 'admin', tenant_id)
  OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = alunos_pendentes.tenant_id AND t.owner_user_id = auth.uid())
);

CREATE TRIGGER alunos_pendentes_updated_at
BEFORE UPDATE ON public.alunos_pendentes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();