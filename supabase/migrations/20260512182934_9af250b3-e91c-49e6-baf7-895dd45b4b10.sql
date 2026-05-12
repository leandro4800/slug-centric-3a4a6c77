
-- AVATARS
DROP POLICY IF EXISTS "Upload aberto para avatars" ON storage.objects;
DROP POLICY IF EXISTS "Update aberto para avatars" ON storage.objects;
DROP POLICY IF EXISTS "Delete aberto para avatars" ON storage.objects;

CREATE POLICY "avatars_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.can_manage_athlete_avatar(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.can_manage_athlete_avatar(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.can_manage_athlete_avatar(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);

-- BRANDING (folder = tenant_id)
DROP POLICY IF EXISTS "Upload aberto para branding" ON storage.objects;
DROP POLICY IF EXISTS "Update aberto para branding" ON storage.objects;
DROP POLICY IF EXISTS "Delete aberto para branding" ON storage.objects;

CREATE POLICY "branding_insert_owner" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'branding'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (t.owner_user_id = auth.uid()
             OR public.has_role(auth.uid(), 'coach'::public.app_role, t.id))
    )
  )
);
CREATE POLICY "branding_update_owner" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'branding'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (t.owner_user_id = auth.uid()
             OR public.has_role(auth.uid(), 'coach'::public.app_role, t.id))
    )
  )
);
CREATE POLICY "branding_delete_owner" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'branding'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (t.owner_user_id = auth.uid()
             OR public.has_role(auth.uid(), 'coach'::public.app_role, t.id))
    )
  )
);

-- COACHES (folder = tenant_id)
DROP POLICY IF EXISTS "Upload aberto para coaches" ON storage.objects;
DROP POLICY IF EXISTS "Update aberto para coaches" ON storage.objects;
DROP POLICY IF EXISTS "Delete aberto para coaches" ON storage.objects;

CREATE POLICY "coaches_insert_owner" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'coaches'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (t.owner_user_id = auth.uid()
             OR public.has_role(auth.uid(), 'coach'::public.app_role, t.id))
    )
  )
);
CREATE POLICY "coaches_update_owner" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'coaches'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (t.owner_user_id = auth.uid()
             OR public.has_role(auth.uid(), 'coach'::public.app_role, t.id))
    )
  )
);
CREATE POLICY "coaches_delete_owner" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'coaches'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (t.owner_user_id = auth.uid()
             OR public.has_role(auth.uid(), 'coach'::public.app_role, t.id))
    )
  )
);
