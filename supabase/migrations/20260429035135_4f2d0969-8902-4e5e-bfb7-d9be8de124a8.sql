
ALTER TABLE public.treinos_prescritos
  ADD COLUMN IF NOT EXISTS video_coach_url TEXT;

ALTER TABLE public.biblioteca_exercicios
  ADD COLUMN IF NOT EXISTS video_coach_url TEXT;

ALTER TABLE public.referencia_videos
  ADD COLUMN IF NOT EXISTS video_coach_url TEXT;
