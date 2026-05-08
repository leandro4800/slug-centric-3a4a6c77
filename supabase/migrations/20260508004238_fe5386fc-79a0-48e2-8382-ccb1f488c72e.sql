
-- Branding bucket policies: path is `{tenant_id}/...`
-- Allow public read (bucket is public, but explicit policy helps).
CREATE POLICY "branding_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "branding_insert_owner_or_admin"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'branding'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (t.owner_user_id = auth.uid() OR has_role(auth.uid(), 'coach'::app_role, t.id))
    )
  )
);

CREATE POLICY "branding_update_owner_or_admin"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'branding'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (t.owner_user_id = auth.uid() OR has_role(auth.uid(), 'coach'::app_role, t.id))
    )
  )
);

CREATE POLICY "branding_delete_owner_or_admin"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'branding'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (t.owner_user_id = auth.uid() OR has_role(auth.uid(), 'coach'::app_role, t.id))
    )
  )
);
