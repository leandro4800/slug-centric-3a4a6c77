ALTER TABLE public.tenants
  ALTER COLUMN videos_fonte_alunos SET DEFAULT 'app';

UPDATE public.tenants
SET videos_fonte_alunos = 'app',
    usar_apenas_meus_videos = false
WHERE videos_fonte_alunos = 'ambos';