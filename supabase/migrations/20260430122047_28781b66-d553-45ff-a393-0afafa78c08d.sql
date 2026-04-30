
-- ===== STORAGE: bucket 'avatars' =====
-- Leitura pública (bucket já é público)
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- INSERT: dono da pasta, admin global, ou coach do tenant do aluno
DROP POLICY IF EXISTS "avatars_insert_owner_or_staff" ON storage.objects;
CREATE POLICY "avatars_insert_owner_or_staff"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.perfis p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND public.has_role(auth.uid(), 'coach'::app_role, p.tenant_id)
    )
  )
);

-- UPDATE
DROP POLICY IF EXISTS "avatars_update_owner_or_staff" ON storage.objects;
CREATE POLICY "avatars_update_owner_or_staff"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.perfis p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND public.has_role(auth.uid(), 'coach'::app_role, p.tenant_id)
    )
  )
);

-- DELETE
DROP POLICY IF EXISTS "avatars_delete_owner_or_staff" ON storage.objects;
CREATE POLICY "avatars_delete_owner_or_staff"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.perfis p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND public.has_role(auth.uid(), 'coach'::app_role, p.tenant_id)
    )
  )
);

-- ===== TABLE: public.perfis UPDATE =====
DROP POLICY IF EXISTS "perfis_update_own" ON public.perfis;
CREATE POLICY "perfis_update_own_or_staff"
ON public.perfis FOR UPDATE
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'coach'::app_role, tenant_id)
);
