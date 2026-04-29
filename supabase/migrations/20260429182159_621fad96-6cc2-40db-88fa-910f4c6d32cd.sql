-- Create profissionais table
CREATE TABLE public.profissionais (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    especialidade TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create alunos table (extending the existing perfis or as a separate specialized table)
-- Given we already have 'perfis', we'll create 'alunos' to store student-specific details
CREATE TABLE public.alunos (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    profissional_id UUID REFERENCES public.profissionais(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    objetivo TEXT,
    nivel_experiencia TEXT,
    observacoes_medicas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create biblioteca_metodologia_pacho table
CREATE TABLE public.biblioteca_metodologia_pacho (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
    nome_exercicio TEXT NOT NULL,
    grupo_muscular TEXT NOT NULL,
    video_url TEXT,
    descricao_metodologia TEXT, -- Pacho methodology details
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create biblioteca_treinos_pacho table
CREATE TABLE public.biblioteca_treinos_pacho (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
    nome_template TEXT NOT NULL,
    descricao TEXT,
    objetivo_template TEXT,
    estrutura_json JSONB, -- Stores the training structure (days, exercises, etc)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biblioteca_metodologia_pacho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biblioteca_treinos_pacho ENABLE ROW LEVEL SECURITY;

-- Policies for profissionais
CREATE POLICY "Profissionais can view their own profile" ON public.profissionais
    FOR SELECT USING (auth.uid() = id);

-- Policies for alunos
CREATE POLICY "Alunos can view their own profile" ON public.alunos
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profissionais can view their alunos" ON public.alunos
    FOR SELECT USING (auth.uid() = profissional_id);

-- Policies for methodology library
CREATE POLICY "Profissionais can manage their exercise library" ON public.biblioteca_metodologia_pacho
    FOR ALL USING (auth.uid() = profissional_id);
CREATE POLICY "Alunos can view exercises from methodology library" ON public.biblioteca_metodologia_pacho
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.alunos WHERE id = auth.uid()
    ));

-- Policies for training library
CREATE POLICY "Profissionais can manage their training templates" ON public.biblioteca_treinos_pacho
    FOR ALL USING (auth.uid() = profissional_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profissionais BEFORE UPDATE ON public.profissionais FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_alunos BEFORE UPDATE ON public.alunos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_biblioteca_metodologia BEFORE UPDATE ON public.biblioteca_metodologia_pacho FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_biblioteca_treinos BEFORE UPDATE ON public.biblioteca_treinos_pacho FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
