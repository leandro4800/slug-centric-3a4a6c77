-- =========================================================
-- Helper: get tenant_id of current user (from perfis)
-- =========================================================
CREATE OR REPLACE FUNCTION public.current_user_tenant()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.perfis WHERE id = auth.uid()
$$;

-- =========================================================
-- biblioteca_exercicios
-- =========================================================
CREATE TABLE public.biblioteca_exercicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  grupo_muscular text NOT NULL,
  equipamento text,
  nivel text DEFAULT 'iniciante',
  contraindicacoes text[] DEFAULT '{}',
  series_trabalho int DEFAULT 3,
  repeticoes text DEFAULT '10-12',
  tecnica_intensidade text,
  video_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_biblioteca_tenant_grupo ON public.biblioteca_exercicios(tenant_id, grupo_muscular);
ALTER TABLE public.biblioteca_exercicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biblioteca_read_tenant" ON public.biblioteca_exercicios
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_user_tenant() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "biblioteca_coach_manage" ON public.biblioteca_exercicios
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_biblioteca_updated_at
  BEFORE UPDATE ON public.biblioteca_exercicios
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- referencia_videos
-- =========================================================
CREATE TABLE public.referencia_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome_exercicio text NOT NULL,
  url_video text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nome_exercicio)
);
ALTER TABLE public.referencia_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "videos_read_tenant" ON public.referencia_videos
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_user_tenant() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "videos_coach_manage" ON public.referencia_videos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_videos_updated_at
  BEFORE UPDATE ON public.referencia_videos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- treinos_prescritos
-- =========================================================
CREATE TABLE public.treinos_prescritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL,
  dia_semana text NOT NULL,
  ordem int DEFAULT 0,
  exercicio text NOT NULL,
  series text,
  repeticoes text,
  observacao text,
  video_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_treinos_aluno ON public.treinos_prescritos(aluno_id, dia_semana, ordem);
ALTER TABLE public.treinos_prescritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treinos_aluno_read" ON public.treinos_prescritos
  FOR SELECT TO authenticated
  USING (
    aluno_id = auth.uid()
    OR public.has_role(auth.uid(), 'coach', tenant_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "treinos_coach_manage" ON public.treinos_prescritos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_treinos_updated_at
  BEFORE UPDATE ON public.treinos_prescritos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- historico_cargas
-- =========================================================
CREATE TABLE public.historico_cargas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  exercicio_nome text NOT NULL,
  carga_kg numeric(6,2) NOT NULL DEFAULT 0,
  repeticoes_feitas int NOT NULL DEFAULT 0,
  data_treino date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_historico_user_ex ON public.historico_cargas(user_id, exercicio_nome, data_treino DESC);
ALTER TABLE public.historico_cargas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historico_self_read" ON public.historico_cargas
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'coach', tenant_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "historico_self_insert" ON public.historico_cargas
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'coach', tenant_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "historico_coach_manage" ON public.historico_cargas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- configuracoes_tenant
-- =========================================================
CREATE TABLE public.configuracoes_tenant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  chave text NOT NULL,
  valor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, chave)
);
ALTER TABLE public.configuracoes_tenant ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_read_tenant" ON public.configuracoes_tenant
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_user_tenant() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "config_coach_manage" ON public.configuracoes_tenant
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_config_updated_at
  BEFORE UPDATE ON public.configuracoes_tenant
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- perfis_treino  (dados biométricos / objetivo do aluno)
-- =========================================================
CREATE TABLE public.perfis_treino (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL UNIQUE,
  sexo text,
  idade int,
  peso_kg numeric(5,2),
  altura_cm int,
  bf_pct numeric(4,1),
  objetivo text,
  frequencia_semanal int,
  tempo_treino text,
  lesoes text[] DEFAULT '{}',
  limitacoes text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.perfis_treino ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfil_treino_self_read" ON public.perfis_treino
  FOR SELECT TO authenticated
  USING (
    aluno_id = auth.uid()
    OR public.has_role(auth.uid(), 'coach', tenant_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "perfil_treino_self_upsert" ON public.perfis_treino
  FOR INSERT TO authenticated
  WITH CHECK (
    aluno_id = auth.uid()
    OR public.has_role(auth.uid(), 'coach', tenant_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "perfil_treino_self_update" ON public.perfis_treino
  FOR UPDATE TO authenticated
  USING (
    aluno_id = auth.uid()
    OR public.has_role(auth.uid(), 'coach', tenant_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "perfil_treino_coach_delete" ON public.perfis_treino
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_perfis_treino_updated_at
  BEFORE UPDATE ON public.perfis_treino
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();