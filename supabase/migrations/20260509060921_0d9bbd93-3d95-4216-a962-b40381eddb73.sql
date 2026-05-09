ALTER TABLE public.agendamentos_presenciais
ADD COLUMN IF NOT EXISTS academia_confirmada text;

CREATE INDEX IF NOT EXISTS idx_agp_academia_confirmada
ON public.agendamentos_presenciais (academia_confirmada)
WHERE academia_confirmada IS NOT NULL;