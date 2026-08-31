CREATE TABLE public.coach_marketing_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  image_url TEXT,
  source_photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_id)
);
ALTER TABLE public.coach_marketing_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages own marketing cards" ON public.coach_marketing_cards
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT ALL ON public.coach_marketing_cards TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_marketing_cards TO authenticated;

CREATE TABLE public.coach_marketing_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coach_marketing_generation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach reads own generation log" ON public.coach_marketing_generation_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
GRANT ALL ON public.coach_marketing_generation_log TO service_role;
GRANT SELECT ON public.coach_marketing_generation_log TO authenticated;

ALTER TABLE public.coach_marketing_config ADD COLUMN IF NOT EXISTS phone TEXT;