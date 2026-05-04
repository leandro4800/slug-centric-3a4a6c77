-- 1) Campos de Instagram por tenant
ALTER TABLE public.tenants_private
  ADD COLUMN IF NOT EXISTS instagram_access_token text,
  ADD COLUMN IF NOT EXISTS instagram_business_account_id text,
  ADD COLUMN IF NOT EXISTS instagram_token_expires_at timestamptz;

-- 2) Bucket público para vídeos baixados
INSERT INTO storage.buckets (id, name, public)
VALUES ('vlog_videos', 'vlog_videos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3) Policies do bucket
DROP POLICY IF EXISTS "vlog_videos public read" ON storage.objects;
CREATE POLICY "vlog_videos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'vlog_videos');

DROP POLICY IF EXISTS "vlog_videos auth insert" ON storage.objects;
CREATE POLICY "vlog_videos auth insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vlog_videos');

DROP POLICY IF EXISTS "vlog_videos auth update" ON storage.objects;
CREATE POLICY "vlog_videos auth update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vlog_videos');

DROP POLICY IF EXISTS "vlog_videos auth delete" ON storage.objects;
CREATE POLICY "vlog_videos auth delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vlog_videos');