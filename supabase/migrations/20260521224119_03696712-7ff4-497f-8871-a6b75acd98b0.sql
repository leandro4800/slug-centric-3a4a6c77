ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_perfis_push_token ON public.perfis(push_token);