-- Create table to track token usage (link_reivindicacao_usos)
CREATE TABLE IF NOT EXISTS public.link_reivindicacao_usos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL,
  aluno_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Use GRANT to set permissions
GRANT SELECT, INSERT ON public.link_reivindicacao_usos TO authenticated;
GRANT ALL ON public.link_reivindicacao_usos TO service_role;

-- Enable Row Level Security
ALTER TABLE public.link_reivindicacao_usos ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own claims" 
ON public.link_reivindicacao_usos 
FOR SELECT 
TO authenticated 
USING (auth.uid() = aluno_id);

CREATE POLICY "Users can register their own claims" 
ON public.link_reivindicacao_usos 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = aluno_id);

-- Ensure coach_marketing_config has correct RLS and permissions if missing
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_marketing_config TO authenticated;
GRANT ALL ON public.coach_marketing_config TO service_role;

-- If for some reason user_id unique constraint was missing, this ensures it
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coach_marketing_config_user_id_key') THEN
    ALTER TABLE public.coach_marketing_config ADD CONSTRAINT coach_marketing_config_user_id_key UNIQUE (user_id);
  END IF;
END $$;
