-- 1. Add Hematócrito to references
INSERT INTO public.referencias_exames (nome, codigo, categoria, unidade, valor_minimo, valor_maximo, valor_ouro_min, valor_ouro_max, importancia, descricao)
VALUES (
  'Hematócrito', 
  'hematocrito', 
  'Hemograma', 
  '%', 
  38, 
  50, 
  42, 
  48, 
  'Alta', 
  'Percentual de glóbulos vermelhos no sangue. Valores acima de 52% em atletas podem indicar risco cardiovascular aumentado (policitemia).'
)
ON CONFLICT (codigo) DO UPDATE SET
  valor_ouro_min = EXCLUDED.valor_ouro_min,
  valor_ouro_max = EXCLUDED.valor_ouro_max,
  descricao = EXCLUDED.descricao;

-- 2. Enhance biblioteca_metodologia_pacho for structured data
ALTER TABLE public.biblioteca_metodologia_pacho 
ADD COLUMN IF NOT EXISTS nivel TEXT,
ADD COLUMN IF NOT EXISTS frequencia_semanal INTEGER,
ADD COLUMN IF NOT EXISTS divisao TEXT,
ADD COLUMN IF NOT EXISTS enfase TEXT,
ADD COLUMN IF NOT EXISTS estrutura_json JSONB;

-- 3. Add index for faster RAG/Search
CREATE INDEX IF NOT EXISTS idx_metodologia_pacho_lookup ON public.biblioteca_metodologia_pacho (nivel, frequencia_semanal, enfase);

-- 4. Ensure analises_clinicas has a way to flag critical risk
ALTER TABLE public.analises_clinicas
ADD COLUMN IF NOT EXISTS alerta_critico BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS motivo_alerta TEXT;
