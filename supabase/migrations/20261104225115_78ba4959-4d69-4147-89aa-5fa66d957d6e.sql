ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS vertical_manual boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.detect_tenant_vertical()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_text text;
  v_fight_kw text[] := ARRAY['ct de luta','ct luta','ct lutas','ct de lutas','centro de treinamento','escola de luta','escola de lutas','academia de luta','academia de lutas','fight','luta','lutas','mma','jiu','jitsu','bjj','nogi','no-gi','no gi','muay','muaythai','thai','boxe','boxing','kickbox','karate','karatê','judo','judô','wrestling','submission','grappling','sambo','capoeira','taekwondo','sanda','krav','octogono','octógono','vale tudo','luta livre'];
  v_crossfit_kw text[] := ARRAY['crossfit','cross fit','cross training','crosstraining','wod','functional fitness','treino funcional','funcional','hiit','box de crossfit','studio','alta performance','condicionamento fisico','condicionamento físico','strength','conditioning','strength and conditioning'];
  kw text;
BEGIN
  IF COALESCE(NEW.vertical_manual, false) THEN RETURN NEW; END IF;
  IF NEW.vertical IS DISTINCT FROM 'personal'::tenant_vertical THEN RETURN NEW; END IF;
  v_text := lower(coalesce(NEW.nome,'')||' '||coalesce(NEW.slug,'')||' '||coalesce(NEW.tagline,'')||' '||coalesce(array_to_string(NEW.especialidades,' '),''));
  FOREACH kw IN ARRAY v_fight_kw LOOP
    IF position(kw IN v_text) > 0 THEN NEW.vertical := 'fight'; RETURN NEW; END IF;
  END LOOP;
  FOREACH kw IN ARRAY v_crossfit_kw LOOP
    IF position(kw IN v_text) > 0 THEN NEW.vertical := 'crossfit'; RETURN NEW; END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_tenant_vertical_lock()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF (NEW.vertical IS DISTINCT FROM OLD.vertical OR NEW.vertical_manual IS DISTINCT FROM OLD.vertical_manual)
     AND auth.uid() IS NOT NULL
     AND NOT has_role(auth.uid(), 'admin'::app_role)
     AND NOT (OLD.owner_user_id = auth.uid() AND OLD.status = 'pending'::tenant_status) THEN
    RAISE EXCEPTION 'Não autorizado a alterar o tipo do painel';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_enforce_tenant_vertical_lock ON public.tenants;
CREATE TRIGGER trg_enforce_tenant_vertical_lock BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_vertical_lock();

UPDATE public.tenants SET vertical_manual = true WHERE slug = 'metodojackson';

-- Presets
CREATE TABLE public.box_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nivel text NOT NULL CHECK (nivel IN ('iniciante','intermediario','avancado')),
  frequencia int NOT NULL CHECK (frequencia IN (3,4,5)),
  titulo text NOT NULL,
  semana jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nivel, frequencia)
);
GRANT SELECT ON public.box_presets TO authenticated;
GRANT ALL ON public.box_presets TO service_role;
ALTER TABLE public.box_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Presets legíveis" ON public.box_presets FOR SELECT TO authenticated USING (true);

INSERT INTO public.box_presets (nivel, frequencia, titulo, semana)
SELECT n.nivel, f.freq, initcap(n.label)||' '||f.freq||'x',
  (SELECT jsonb_agg(d ORDER BY i) FROM (
    SELECT i, jsonb_build_object(
      'titulo', CASE (i % 5) WHEN 1 THEN 'Força + Metcon curto' WHEN 2 THEN 'Ginástica + AMRAP' WHEN 3 THEN 'Levantamento + EMOM' WHEN 4 THEN 'Endurance For Time' ELSE 'Benchmark / Chipper' END,
      'formato', CASE (i % 5) WHEN 1 THEN 'FOR_TIME' WHEN 2 THEN 'AMRAP' WHEN 3 THEN 'EMOM' WHEN 4 THEN 'RFT' ELSE 'CHIPPER' END,
      'time_cap_min', n.cap + (i % 3) * 2,
      'aquecimento', '10 min: mobilidade, ativação e técnica do dia',
      'forca_skill', n.forca,
      'acessorio', n.acess,
      'movimentos', CASE (i % 5)
        WHEN 1 THEN '[{"rx":"21-15-9 Thrusters 43/30kg","scaled":"21-15-9 Thrusters 20/15kg"},{"rx":"Pull-ups","scaled":"Ring rows"}]'::jsonb
        WHEN 2 THEN '[{"rx":"5 Pull-ups","scaled":"5 Ring rows"},{"rx":"10 Push-ups","scaled":"10 Push-ups no joelho"},{"rx":"15 Air squats","scaled":"15 Air squats"}]'::jsonb
        WHEN 3 THEN '[{"rx":"Min 1: 12 Cal Row","scaled":"Min 1: 9 Cal Row"},{"rx":"Min 2: 10 KB Swings 24/16","scaled":"Min 2: 10 KB Swings 16/8"}]'::jsonb
        WHEN 4 THEN '[{"rx":"400m Run","scaled":"200m Run"},{"rx":"15 Wall balls 9/6kg","scaled":"15 Wall balls 6/4kg"}]'::jsonb
        ELSE '[{"rx":"50 Double unders","scaled":"100 Single unders"},{"rx":"40 Box jumps 60/50","scaled":"40 Step-ups"},{"rx":"30 Deadlifts 100/70","scaled":"30 Deadlifts 60/40"}]'::jsonb END
    ) d FROM generate_series(1, f.freq) i) s)
FROM (VALUES ('iniciante','Iniciante',10,'Técnica: agachamento e LPO com PVC/barra leve','Core e mobilidade'),
             ('intermediario','Intermediário',14,'Força: 5x5 a 75% (back squat / deadlift / press)','Ginástica estrita e core'),
             ('avancado','Avançado',18,'Força: 5x3 a 85% + complexo de LPO','Skill avançado (muscle-up, HSPU) e core')) n(nivel,label,cap,forca,acess)
CROSS JOIN (VALUES (3),(4),(5)) f(freq);

-- Turmas
CREATE TABLE public.box_turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  horario text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.box_turmas(tenant_id);

CREATE TABLE public.box_turma_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  turma_id uuid NOT NULL REFERENCES public.box_turmas(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (turma_id, aluno_id)
);
CREATE INDEX ON public.box_turma_alunos(tenant_id, aluno_id);

CREATE TABLE public.box_wods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  turma_id uuid NOT NULL REFERENCES public.box_turmas(id) ON DELETE CASCADE,
  data date NOT NULL,
  titulo text,
  aquecimento text,
  forca_skill jsonb NOT NULL DEFAULT '[]'::jsonb,
  acessorio text,
  formato text NOT NULL DEFAULT 'FOR_TIME',
  time_cap_seg int,
  rounds int,
  movimentos jsonb NOT NULL DEFAULT '[]'::jsonb,
  benchmark_nome text,
  publicado boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (turma_id, data)
);
CREATE INDEX ON public.box_wods(tenant_id, data);

CREATE TABLE public.box_resultados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  wod_id uuid NOT NULL REFERENCES public.box_wods(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL,
  escala text NOT NULL DEFAULT 'rx',
  tempo_seg int,
  rounds int,
  reps int,
  carga_kg numeric,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wod_id, aluno_id)
);
CREATE INDEX ON public.box_resultados(tenant_id, aluno_id);

CREATE TABLE public.box_benchmark_prs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL,
  benchmark text NOT NULL,
  escala text NOT NULL DEFAULT 'rx',
  resultado text NOT NULL,
  data date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.box_benchmark_prs(tenant_id, aluno_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.box_turmas, public.box_turma_alunos, public.box_wods, public.box_resultados, public.box_benchmark_prs TO authenticated;
GRANT ALL ON public.box_turmas, public.box_turma_alunos, public.box_wods, public.box_resultados, public.box_benchmark_prs TO service_role;
ALTER TABLE public.box_turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_turma_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_wods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_resultados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_benchmark_prs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_box_staff(_tenant uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT has_role(auth.uid(),'admin'::app_role)
      OR has_role(auth.uid(),'coach'::app_role,_tenant)
      OR EXISTS (SELECT 1 FROM tenants WHERE id=_tenant AND owner_user_id=auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.is_box_turma_member(_turma uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM box_turma_alunos a JOIN perfis p ON p.id=a.aluno_id AND p.tenant_id=a.tenant_id
                 WHERE a.turma_id=_turma AND a.aluno_id=auth.uid());
$$;

CREATE POLICY "staff turmas" ON public.box_turmas FOR ALL TO authenticated USING (is_box_staff(tenant_id)) WITH CHECK (is_box_staff(tenant_id));
CREATE POLICY "aluno ve suas turmas" ON public.box_turmas FOR SELECT TO authenticated USING (is_box_turma_member(id));

CREATE POLICY "staff turma alunos" ON public.box_turma_alunos FOR ALL TO authenticated USING (is_box_staff(tenant_id)) WITH CHECK (is_box_staff(tenant_id) AND EXISTS (SELECT 1 FROM box_turmas t WHERE t.id=turma_id AND t.tenant_id=box_turma_alunos.tenant_id));
CREATE POLICY "aluno ve propria matricula" ON public.box_turma_alunos FOR SELECT TO authenticated USING (aluno_id = auth.uid());

CREATE POLICY "staff wods" ON public.box_wods FOR ALL TO authenticated USING (is_box_staff(tenant_id)) WITH CHECK (is_box_staff(tenant_id) AND EXISTS (SELECT 1 FROM box_turmas t WHERE t.id=turma_id AND t.tenant_id=box_wods.tenant_id));
CREATE POLICY "aluno ve wods publicados" ON public.box_wods FOR SELECT TO authenticated USING (publicado AND is_box_turma_member(turma_id));

CREATE POLICY "staff resultados" ON public.box_resultados FOR ALL TO authenticated USING (is_box_staff(tenant_id)) WITH CHECK (is_box_staff(tenant_id));
CREATE POLICY "turma ve ranking" ON public.box_resultados FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM box_wods w WHERE w.id=wod_id AND w.tenant_id=box_resultados.tenant_id AND is_box_turma_member(w.turma_id)));
CREATE POLICY "aluno lanca resultado" ON public.box_resultados FOR INSERT TO authenticated WITH CHECK (aluno_id=auth.uid() AND EXISTS (SELECT 1 FROM box_wods w WHERE w.id=wod_id AND w.tenant_id=box_resultados.tenant_id AND w.publicado AND is_box_turma_member(w.turma_id)));
CREATE POLICY "aluno edita resultado" ON public.box_resultados FOR UPDATE TO authenticated USING (aluno_id=auth.uid()) WITH CHECK (aluno_id=auth.uid() AND EXISTS (SELECT 1 FROM box_wods w WHERE w.id=wod_id AND w.tenant_id=box_resultados.tenant_id AND is_box_turma_member(w.turma_id)));
CREATE POLICY "aluno apaga resultado" ON public.box_resultados FOR DELETE TO authenticated USING (aluno_id=auth.uid());

CREATE POLICY "staff prs" ON public.box_benchmark_prs FOR ALL TO authenticated USING (is_box_staff(tenant_id)) WITH CHECK (is_box_staff(tenant_id));
CREATE POLICY "aluno prs" ON public.box_benchmark_prs FOR ALL TO authenticated USING (aluno_id=auth.uid()) WITH CHECK (aluno_id=auth.uid() AND tenant_id = perfis_stored_tenant(auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_box_row() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF TG_TABLE_NAME = 'box_wods' THEN
    IF NEW.formato NOT IN ('AMRAP','EMOM','FOR_TIME','RFT','CHIPPER','TABATA','LADDER') THEN RAISE EXCEPTION 'Formato de WOD inválido'; END IF;
  ELSE
    IF NEW.escala NOT IN ('rx','scaled') THEN RAISE EXCEPTION 'Escala inválida'; END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_box_wods BEFORE INSERT OR UPDATE ON public.box_wods FOR EACH ROW EXECUTE FUNCTION public.validate_box_row();
CREATE TRIGGER trg_validate_box_resultados BEFORE INSERT OR UPDATE ON public.box_resultados FOR EACH ROW EXECUTE FUNCTION public.validate_box_row();
CREATE TRIGGER trg_box_turmas_updated BEFORE UPDATE ON public.box_turmas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();