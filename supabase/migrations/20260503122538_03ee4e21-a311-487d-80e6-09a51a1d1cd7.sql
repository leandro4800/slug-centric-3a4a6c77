
-- Drop broad SELECT policies that allow listing all files in public buckets
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "coaches_select_public" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- For 'branding' bucket if there is one (none listed, but be safe)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
           AND qual = '(bucket_id = ''branding''::text)'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END$$;
