
DO $$ BEGIN
  CREATE TYPE public.tenant_vertical AS ENUM ('personal', 'crossfit', 'fight');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS vertical public.tenant_vertical NOT NULL DEFAULT 'personal';

ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS vertical public.tenant_vertical NOT NULL DEFAULT 'personal';

-- WODs
CREATE TABLE IF NOT EXISTS public.wods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  nome TEXT,
  tipo TEXT,
  descricao TEXT,
  duracao_min INT,
  categoria TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wods TO authenticated;
GRANT ALL ON public.wods TO service_role;
ALTER TABLE public.wods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wods coach manage" ON public.wods FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = wods.tenant_id AND t.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = wods.tenant_id AND t.owner_user_id = auth.uid()));
CREATE POLICY "wods aluno read" ON public.wods FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis p WHERE p.id = auth.uid() AND p.tenant_id = wods.tenant_id));

-- Resultados WOD
CREATE TABLE IF NOT EXISTS public.wod_resultados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  wod_id UUID NOT NULL REFERENCES public.wods(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL,
  resultado TEXT,
  categoria TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wod_resultados TO authenticated;
GRANT ALL ON public.wod_resultados TO service_role;
ALTER TABLE public.wod_resultados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wod_resultados coach" ON public.wod_resultados FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = wod_resultados.tenant_id AND t.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = wod_resultados.tenant_id AND t.owner_user_id = auth.uid()));
CREATE POLICY "wod_resultados aluno own" ON public.wod_resultados FOR ALL TO authenticated
  USING (aluno_id = auth.uid()) WITH CHECK (aluno_id = auth.uid());

-- Benchmarks
CREATE TABLE IF NOT EXISTS public.benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT,
  descricao TEXT,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.benchmarks TO authenticated;
GRANT ALL ON public.benchmarks TO service_role;
ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "benchmarks read" ON public.benchmarks FOR SELECT TO authenticated
  USING (is_global
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = benchmarks.tenant_id AND t.owner_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.perfis p WHERE p.id = auth.uid() AND p.tenant_id = benchmarks.tenant_id));
CREATE POLICY "benchmarks coach manage" ON public.benchmarks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = benchmarks.tenant_id AND t.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = benchmarks.tenant_id AND t.owner_user_id = auth.uid()));

-- PRs
CREATE TABLE IF NOT EXISTS public.prs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL,
  exercicio TEXT NOT NULL,
  valor TEXT NOT NULL,
  unidade TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prs TO authenticated;
GRANT ALL ON public.prs TO service_role;
ALTER TABLE public.prs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prs coach" ON public.prs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = prs.tenant_id AND t.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = prs.tenant_id AND t.owner_user_id = auth.uid()));
CREATE POLICY "prs aluno own" ON public.prs FOR ALL TO authenticated
  USING (aluno_id = auth.uid()) WITH CHECK (aluno_id = auth.uid());

-- Camps luta
CREATE TABLE IF NOT EXISTS public.camps_luta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL,
  nome TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_luta DATE NOT NULL,
  peso_meta NUMERIC,
  modalidade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camps_luta TO authenticated;
GRANT ALL ON public.camps_luta TO service_role;
ALTER TABLE public.camps_luta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camps coach" ON public.camps_luta FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = camps_luta.tenant_id AND t.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = camps_luta.tenant_id AND t.owner_user_id = auth.uid()));
CREATE POLICY "camps aluno" ON public.camps_luta FOR SELECT TO authenticated
  USING (aluno_id = auth.uid());

-- Sessões luta
CREATE TABLE IF NOT EXISTS public.sessoes_luta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  camp_id UUID REFERENCES public.camps_luta(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL,
  data DATE NOT NULL,
  tipo TEXT,
  descricao TEXT,
  duracao_min INT,
  intensidade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessoes_luta TO authenticated;
GRANT ALL ON public.sessoes_luta TO service_role;
ALTER TABLE public.sessoes_luta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessoes_luta coach" ON public.sessoes_luta FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = sessoes_luta.tenant_id AND t.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = sessoes_luta.tenant_id AND t.owner_user_id = auth.uid()));
CREATE POLICY "sessoes_luta aluno" ON public.sessoes_luta FOR SELECT TO authenticated
  USING (aluno_id = auth.uid());

-- Peso diário
CREATE TABLE IF NOT EXISTS public.peso_diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  peso NUMERIC NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, data)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.peso_diario TO authenticated;
GRANT ALL ON public.peso_diario TO service_role;
ALTER TABLE public.peso_diario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "peso_diario coach" ON public.peso_diario FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = peso_diario.tenant_id AND t.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = peso_diario.tenant_id AND t.owner_user_id = auth.uid()));
CREATE POLICY "peso_diario aluno" ON public.peso_diario FOR ALL TO authenticated
  USING (aluno_id = auth.uid()) WITH CHECK (aluno_id = auth.uid());
