ALTER TABLE public.dietas ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

-- Atualizar dietas existentes para publicadas (para não quebrar o que já existe)
UPDATE public.dietas SET is_published = TRUE WHERE is_published IS NULL;