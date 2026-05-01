ALTER TABLE public.anamnese_aluno 
ADD COLUMN IF NOT EXISTS faz_uso_ergogenicos BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS detalhes_ergogenicos TEXT,
ADD COLUMN IF NOT EXISTS nivel_experiencia TEXT;

-- Update RLS if needed (usually anamnese_aluno already has policies)
-- The existing policies should cover these new columns automatically if they are for the whole table.
