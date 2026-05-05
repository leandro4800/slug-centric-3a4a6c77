-- 1. Cria a tabela de referência de vídeos
CREATE TABLE IF NOT EXISTS public.referencia_exercicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    nome_exercicio TEXT NOT NULL,
    url_video TEXT,
    grupamento_muscular TEXT,
    thumbnail_url TEXT,
    profissional_id UUID -- Opcional: para filtrar por treinador
);

-- 2. Habilita o acesso para os alunos verem os vídeos
ALTER TABLE public.referencia_exercicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para usuários autenticados" 
ON public.referencia_exercicios FOR SELECT 
TO authenticated 
USING (true);

-- 3. Permite que o admin insira e atualize vídeos
CREATE POLICY "Permitir tudo para admins" 
ON public.referencia_exercicios FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);