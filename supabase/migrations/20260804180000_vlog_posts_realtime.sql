-- Enable Realtime updates for vlog_posts (aluno home refreshes when coach syncs Reels)
ALTER TABLE public.vlog_posts REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vlog_posts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
