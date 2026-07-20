CREATE TABLE public.avaliacao_avulsa_alunos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  coach_user_id uuid NOT NULL,
  nome text NOT NULL,
  sexo text,
  data_nascimento date,
  telefone text,
  email text,
  peso_inicial_kg numeric,
  altura_cm numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacao_avulsa_alunos TO authenticated;
GRANT ALL ON public.avaliacao_avulsa_alunos TO service_role;

ALTER TABLE public.avaliacao_avulsa_alunos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage tenant avulso evaluation people"
ON public.avaliacao_avulsa_alunos
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'coach'::public.app_role, tenant_id)
  OR EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = avaliacao_avulsa_alunos.tenant_id
      AND t.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'coach'::public.app_role, tenant_id)
  OR EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = avaliacao_avulsa_alunos.tenant_id
      AND t.owner_user_id = auth.uid()
  )
);

CREATE TRIGGER update_avaliacao_avulsa_alunos_updated_at
BEFORE UPDATE ON public.avaliacao_avulsa_alunos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();