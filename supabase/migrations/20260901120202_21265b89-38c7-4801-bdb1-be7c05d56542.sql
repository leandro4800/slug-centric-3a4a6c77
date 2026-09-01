-- 1. Dojo Virtual
CREATE TABLE public.dojo_conteudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  modalidade TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  video_url TEXT NOT NULL,
  nivel TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_conteudos TO authenticated;
GRANT ALL ON public.dojo_conteudos TO service_role;

ALTER TABLE public.dojo_conteudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach gerencia conteudo do proprio tenant"
  ON public.dojo_conteudos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Aluno ve conteudo do proprio tenant"
  ON public.dojo_conteudos FOR SELECT TO authenticated
  USING (tenant_id = (SELECT p.tenant_id FROM public.perfis p WHERE p.id = auth.uid()));

CREATE INDEX idx_dojo_conteudos_tenant_modalidade ON public.dojo_conteudos (tenant_id, modalidade, ordem);

CREATE TRIGGER trg_dojo_conteudos_updated_at
  BEFORE UPDATE ON public.dojo_conteudos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Biblioteca de exercícios por modalidade
ALTER TABLE public.referencia_exercicios
  ADD COLUMN IF NOT EXISTS modalidade TEXT,
  ADD COLUMN IF NOT EXISTS valencia TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT;

CREATE INDEX IF NOT EXISTS idx_referencia_exercicios_modalidade
  ON public.referencia_exercicios (modalidade) WHERE modalidade IS NOT NULL;

-- 3. Modalidade de luta do aluno
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS modalidade_luta TEXT;

-- 4. Seed global (tenant_id NULL = disponível para todos os CTs)
INSERT INTO public.referencia_exercicios (nome_exercicio, url_video, origem, modalidade, valencia, descricao, grupamento_muscular)
VALUES
('Barra Fixa com Lapela / Keikogi','https://www.youtube.com/watch?v=eGo4IYlbE5g','youtube','bjj','FORÇA DE PEGADA & ISOMETRIA DE CORE','Suspensão pela lapela do kimono — foco em grip e antebraço. 4x até a falha, descanso 90s.','Costas'),
('Abdominal Canivete na Fita de Suspensão','https://www.youtube.com/watch?v=6uT8p2wm0Ic','youtube','bjj','FORÇA DE PEGADA & ISOMETRIA DE CORE','TRX/argolas — estabilidade de core anti-extensão essencial para guarda e passagem. 4x10-12.','Core'),
('Levantamento Terra / Deadlift','https://www.youtube.com/watch?v=op9kVnSso6Q','youtube','bjj','POTÊNCIA DE QUADRIL','Cadeia posterior para passadores e guardeiros. 5x5 pesado, descanso 2-3min.','Posterior'),
('Elevação de Quadril com Carga / Hip Thrust','https://www.youtube.com/watch?v=xDmFkJxPzeM','youtube','bjj','POTÊNCIA DE QUADRIL','Potência para raspagens, pontes e recomposição de guarda. 4x8-10 com pausa isométrica no topo.','Glúteo'),
('Arremesso de Medicine Ball Rotacional na Parede','https://www.youtube.com/watch?v=U7Q0BbGx3zg','youtube','muay_thai','POTÊNCIA ROTACIONAL','Gera potência dos socos e chutes rodados. 4x8 cada lado — explosivo.','Core'),
('Landmine Rotation','https://www.youtube.com/watch?v=D6JeoIYyzhY','youtube','muay_thai','POTÊNCIA ROTACIONAL','Core rotacional para absorção e aplicação de golpes. 4x10 cada lado.','Core'),
('Agachamento Salto / Jump Squat','https://www.youtube.com/watch?v=CVaEhXotL7M','youtube','muay_thai','RESISTÊNCIA EXPLOSIVA','Explosão para chutes altos e deslocamento tático. 5x6 máximo esforço.','Pernas'),
('Desenvolvimento em Pé com Barra / Overhead Press','https://www.youtube.com/watch?v=2yjwXTZQDDI','youtube','muay_thai','RESISTÊNCIA EXPLOSIVA','Resistência para manter a guarda alta 5 rounds. 4x8-10.','Ombros'),
('Arremesso de Medicine Ball Rotacional na Parede','https://www.youtube.com/watch?v=U7Q0BbGx3zg','youtube','boxe','POTÊNCIA ROTACIONAL','Gera potência do cruzado e do gancho. 4x8 cada lado.','Core'),
('Landmine Rotation','https://www.youtube.com/watch?v=D6JeoIYyzhY','youtube','boxe','POTÊNCIA ROTACIONAL','Core rotacional para transferência de força quadril→ombro. 4x10 cada lado.','Core'),
('Agachamento Salto / Jump Squat','https://www.youtube.com/watch?v=CVaEhXotL7M','youtube','boxe','RESISTÊNCIA EXPLOSIVA','Mobilidade e explosão de deslocamento no ringue. 5x6.','Pernas'),
('Desenvolvimento em Pé / Overhead Press','https://www.youtube.com/watch?v=2yjwXTZQDDI','youtube','boxe','RESISTÊNCIA EXPLOSIVA','Sustentação da guarda alta em rounds longos. 4x8-10.','Ombros'),
('Power Clean / Segundo Tempo','https://www.youtube.com/watch?v=Kt2iMLiZLBk','youtube','mma','TRANSFERÊNCIA DE FORÇA','Potência máxima triple-extension para quedas e transições. 5x3 pesado.','Corpo inteiro'),
('Flexão Batendo Palma / Plyo Push-up','https://www.youtube.com/watch?v=Kd_DUsMJIsc','youtube','mma','TRANSFERÊNCIA DE FORÇA','Empurrão explosivo no ground and pound. 5x6-8.','Peito'),
('Sprawl com Sled / Trenó de Carga','https://www.youtube.com/watch?v=x1LMhI7VpZ0','youtube','mma','WRESTLING DRILLS','Velocidade e explosão de defesa de queda. 6x20m alternando sprawl+empurrão.','Corpo inteiro'),
('Farmer''s Walk / Caminhada do Fazendeiro','https://www.youtube.com/watch?v=Fkzk_RqlYig','youtube','mma','WRESTLING DRILLS','Isometria geral e sustentação na grade/clinch. 4x40m pesado.','Corpo inteiro');