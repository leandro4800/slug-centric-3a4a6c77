
ALTER TABLE public.sessoes_luta
  ADD COLUMN IF NOT EXISTS rpe smallint CHECK (rpe IS NULL OR (rpe BETWEEN 1 AND 10));

DO $$ BEGIN
  CREATE TYPE public.fight_nutrition_fase AS ENUM ('off_season','pre_camp','weight_cut');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.fight_nutrition_fases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL,
  camp_id uuid REFERENCES public.camps_luta(id) ON DELETE SET NULL,
  fase public.fight_nutrition_fase NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  kcal_meta integer,
  proteina_g integer,
  carboidrato_g integer,
  lipideos_g integer,
  peso_meta_kg numeric(5,2),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fight_nutrition_fases TO authenticated;
GRANT ALL ON public.fight_nutrition_fases TO service_role;

ALTER TABLE public.fight_nutrition_fases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fnf: aluno vê próprias fases"
  ON public.fight_nutrition_fases FOR SELECT TO authenticated
  USING (aluno_id = auth.uid());

CREATE POLICY "fnf: coach dono do tenant gerencia"
  ON public.fight_nutrition_fases FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid()));

CREATE POLICY "fnf: admin global"
  ON public.fight_nutrition_fases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_fnf_aluno ON public.fight_nutrition_fases(aluno_id, data_inicio);
CREATE INDEX IF NOT EXISTS idx_fnf_tenant ON public.fight_nutrition_fases(tenant_id);

CREATE TRIGGER trg_fnf_updated_at BEFORE UPDATE ON public.fight_nutrition_fases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
