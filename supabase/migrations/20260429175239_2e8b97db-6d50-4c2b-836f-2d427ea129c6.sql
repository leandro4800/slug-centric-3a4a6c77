-- =====================================================
-- ENUM
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'coach', 'aluno');

-- =====================================================
-- FUNÇÃO: updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- TABELA: tenants
-- =====================================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,
  logo_url TEXT,
  symbol_url TEXT,
  hero_url TEXT,
  primary_hsl TEXT NOT NULL DEFAULT '357 92% 47%',
  accent_hsl TEXT NOT NULL DEFAULT '357 92% 47%',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- TABELA: perfis
-- =====================================================
CREATE TABLE public.perfis (
  id UUID PRIMARY KEY,
  nome_completo TEXT,
  email TEXT,
  avatar_url TEXT,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_perfis_updated BEFORE UPDATE ON public.perfis
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- TABELA: user_roles
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, tenant_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNÇÕES SECURITY DEFINER
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role, _tenant_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (_tenant_id IS NULL OR tenant_id = _tenant_id OR tenant_id IS NULL)
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_tenant()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.perfis WHERE id = auth.uid();
$$;

-- =====================================================
-- TABELA: biblioteca_exercicios
-- =====================================================
CREATE TABLE public.biblioteca_exercicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  grupo_muscular TEXT NOT NULL,
  equipamento TEXT,
  nivel TEXT,
  series_trabalho INTEGER,
  repeticoes TEXT,
  tecnica_intensidade TEXT,
  contraindicacoes TEXT[],
  video_url TEXT,
  video_coach_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.biblioteca_exercicios ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_bib_updated BEFORE UPDATE ON public.biblioteca_exercicios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- TABELA: treinos_prescritos
-- =====================================================
CREATE TABLE public.treinos_prescritos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL,
  dia_semana TEXT NOT NULL,
  exercicio TEXT NOT NULL,
  series TEXT,
  repeticoes TEXT,
  observacao TEXT,
  ordem INTEGER,
  video_url TEXT,
  video_coach_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.treinos_prescritos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_treinos_updated BEFORE UPDATE ON public.treinos_prescritos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- TABELA: perfis_treino
-- =====================================================
CREATE TABLE public.perfis_treino (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL,
  idade INTEGER,
  sexo TEXT,
  peso_kg NUMERIC,
  altura_cm NUMERIC,
  bf_pct NUMERIC,
  objetivo TEXT,
  frequencia_semanal INTEGER,
  tempo_treino TEXT,
  lesoes TEXT[],
  limitacoes TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.perfis_treino ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_perfis_treino_updated BEFORE UPDATE ON public.perfis_treino
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- TABELA: historico_cargas
-- =====================================================
CREATE TABLE public.historico_cargas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  exercicio_nome TEXT NOT NULL,
  carga_kg NUMERIC NOT NULL DEFAULT 0,
  repeticoes_feitas INTEGER NOT NULL DEFAULT 0,
  data_treino TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.historico_cargas ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TABELA: configuracoes_tenant
-- =====================================================
CREATE TABLE public.configuracoes_tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  chave TEXT NOT NULL,
  valor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, chave)
);
ALTER TABLE public.configuracoes_tenant ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_config_updated BEFORE UPDATE ON public.configuracoes_tenant
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- TABELA: referencia_videos
-- =====================================================
CREATE TABLE public.referencia_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome_exercicio TEXT NOT NULL,
  url_video TEXT NOT NULL,
  video_coach_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referencia_videos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_refvid_updated BEFORE UPDATE ON public.referencia_videos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- TABELA: leads
-- =====================================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS
-- =====================================================

-- tenants: visíveis para todos (necessário para landing/branding)
CREATE POLICY "tenants_select_all" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "tenants_admin_all" ON public.tenants FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- perfis
CREATE POLICY "perfis_select_own" ON public.perfis FOR SELECT
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach', tenant_id));
CREATE POLICY "perfis_insert_own" ON public.perfis FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "perfis_update_own" ON public.perfis FOR UPDATE USING (auth.uid() = id);

-- user_roles
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- biblioteca_exercicios (por tenant)
CREATE POLICY "bib_select_tenant" ON public.biblioteca_exercicios FOR SELECT
  USING (tenant_id = public.current_user_tenant() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "bib_manage_coach" ON public.biblioteca_exercicios FOR ALL
  USING (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));

-- treinos_prescritos
CREATE POLICY "treinos_select" ON public.treinos_prescritos FOR SELECT
  USING (aluno_id = auth.uid() OR public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "treinos_manage_coach" ON public.treinos_prescritos FOR ALL
  USING (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));

-- perfis_treino
CREATE POLICY "pt_select" ON public.perfis_treino FOR SELECT
  USING (aluno_id = auth.uid() OR public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pt_manage_coach" ON public.perfis_treino FOR ALL
  USING (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pt_aluno_update_own" ON public.perfis_treino FOR UPDATE USING (aluno_id = auth.uid());

-- historico_cargas
CREATE POLICY "hc_select_own" ON public.historico_cargas FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "hc_insert_own" ON public.historico_cargas FOR INSERT WITH CHECK (user_id = auth.uid());

-- configuracoes_tenant
CREATE POLICY "cfg_select_tenant" ON public.configuracoes_tenant FOR SELECT
  USING (tenant_id = public.current_user_tenant() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cfg_manage_coach" ON public.configuracoes_tenant FOR ALL
  USING (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));

-- referencia_videos
CREATE POLICY "rv_select_tenant" ON public.referencia_videos FOR SELECT
  USING (tenant_id = public.current_user_tenant() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rv_manage_coach" ON public.referencia_videos FOR ALL
  USING (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));

-- leads (captura pública na landing)
CREATE POLICY "leads_insert_public" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "leads_select_admin" ON public.leads FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));