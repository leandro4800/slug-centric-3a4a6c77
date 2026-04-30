
-- =========================================================
-- PARTE 1: ENUMS
-- =========================================================
CREATE TYPE public.tenant_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE public.plano_intervalo AS ENUM ('mensal', 'trimestral', 'anual');
CREATE TYPE public.assinatura_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'unpaid');

-- =========================================================
-- PARTE 2: TENANTS — colunas novas
-- =========================================================
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS status public.tenant_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS especialidades text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON public.tenants(owner_user_id);

-- Atualiza RLS de tenants: público só vê approved
DROP POLICY IF EXISTS tenants_select_all ON public.tenants;
CREATE POLICY tenants_select_public ON public.tenants
  FOR SELECT USING (
    status = 'approved'
    OR auth.uid() = owner_user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY tenants_insert_self ON public.tenants
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY tenants_update_owner ON public.tenants
  FOR UPDATE USING (auth.uid() = owner_user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- PARTE 3: PERFIS — onboarding flag
-- =========================================================
ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS onboarding_completo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS sexo text;

-- =========================================================
-- PARTE 4: PLANOS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  preco_centavos integer NOT NULL CHECK (preco_centavos >= 0),
  intervalo public.plano_intervalo NOT NULL DEFAULT 'mensal',
  stripe_product_id text,
  stripe_price_id text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planos_tenant ON public.planos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_planos_ativo ON public.planos(ativo);

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY planos_select_public ON public.planos
  FOR SELECT USING (
    (ativo = true AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.status = 'approved'))
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY planos_manage_owner ON public.planos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER trg_planos_updated BEFORE UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- PARTE 5: ASSINATURAS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plano_id uuid REFERENCES public.planos(id) ON DELETE SET NULL,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  status public.assinatura_status NOT NULL DEFAULT 'incomplete',
  current_period_end timestamptz,
  cancelada_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assinaturas_aluno ON public.assinaturas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_tenant ON public.assinaturas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON public.assinaturas(status);

ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY assinaturas_select_own ON public.assinaturas
  FOR SELECT USING (
    aluno_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- inserts/updates só via edge function (service role); sem políticas de insert/update públicas

CREATE TRIGGER trg_assinaturas_updated BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- PARTE 6: ANAMNESE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.anamnese_aluno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL UNIQUE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  -- Saúde
  doencas text[] DEFAULT '{}',
  medicamentos text,
  historico_familiar text,
  cirurgias text,
  lesoes_atuais text,
  -- Hábitos
  qualidade_sono integer CHECK (qualidade_sono BETWEEN 1 AND 10),
  horas_sono numeric(3,1),
  nivel_estresse integer CHECK (nivel_estresse BETWEEN 1 AND 10),
  tabagismo boolean DEFAULT false,
  alcool text,
  -- Nutrição
  suplementos text[] DEFAULT '{}',
  alimentos_ama text,
  alimentos_evita text,
  restricoes_alimentares text[] DEFAULT '{}',
  refeicoes_dia integer,
  agua_litros numeric(3,1),
  -- Treino
  anos_treino numeric(4,1),
  modalidades_anteriores text[] DEFAULT '{}',
  tempo_recuperacao text,
  disponibilidade_dias text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anamnese_tenant ON public.anamnese_aluno(tenant_id);

ALTER TABLE public.anamnese_aluno ENABLE ROW LEVEL SECURITY;

CREATE POLICY anamnese_manage_self ON public.anamnese_aluno
  FOR ALL USING (
    aluno_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    aluno_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER trg_anamnese_updated BEFORE UPDATE ON public.anamnese_aluno
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- PARTE 7: AVALIAÇÕES FÍSICAS (histórico)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.avaliacoes_fisicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  data timestamptz NOT NULL DEFAULT now(),
  peso_kg numeric(5,2) NOT NULL,
  altura_cm numeric(5,2) NOT NULL,
  pescoco_cm numeric(5,2),
  cintura_cm numeric(5,2),
  quadril_cm numeric(5,2),
  bf_pct_calculado numeric(5,2),
  imc numeric(5,2),
  massa_magra_kg numeric(5,2),
  massa_gorda_kg numeric(5,2),
  foto_frente_url text,
  foto_lado_url text,
  foto_costas_url text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_aluno ON public.avaliacoes_fisicas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_data ON public.avaliacoes_fisicas(data DESC);

ALTER TABLE public.avaliacoes_fisicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY avaliacoes_manage_self ON public.avaliacoes_fisicas
  FOR ALL USING (
    aluno_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    aluno_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- =========================================================
-- PARTE 8: STORAGE BUCKETS
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avaliacoes', 'avaliacoes', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('coaches', 'coaches', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avaliacoes_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avaliacoes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avaliacoes_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avaliacoes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "coaches_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'coaches');

CREATE POLICY "coaches_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'coaches'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "coaches_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'coaches'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
