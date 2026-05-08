
DROP POLICY IF EXISTS avatars_insert_owner_or_staff ON storage.objects;
DROP POLICY IF EXISTS avatars_update_owner_or_staff ON storage.objects;
DROP POLICY IF EXISTS avatars_delete_owner_or_staff ON storage.objects;

CREATE POLICY avatars_insert_owner_or_staff ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM perfis p
      LEFT JOIN tenants t ON t.id = p.tenant_id
      WHERE (p.id)::text = (storage.foldername(name))[1]
        AND (
          has_role(auth.uid(), 'coach'::app_role, p.tenant_id)
          OR t.owner_user_id = auth.uid()
        )
    )
  )
);

CREATE POLICY avatars_update_owner_or_staff ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM perfis p
      LEFT JOIN tenants t ON t.id = p.tenant_id
      WHERE (p.id)::text = (storage.foldername(name))[1]
        AND (
          has_role(auth.uid(), 'coach'::app_role, p.tenant_id)
          OR t.owner_user_id = auth.uid()
        )
    )
  )
);

CREATE POLICY avatars_delete_owner_or_staff ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM perfis p
      LEFT JOIN tenants t ON t.id = p.tenant_id
      WHERE (p.id)::text = (storage.foldername(name))[1]
        AND (
          has_role(auth.uid(), 'coach'::app_role, p.tenant_id)
          OR t.owner_user_id = auth.uid()
        )
    )
  )
);
