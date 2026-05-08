
CREATE OR REPLACE FUNCTION public.can_manage_athlete_avatar(_caller uuid, _athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _caller = _athlete_id
    OR has_role(_caller, 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.perfis p
      LEFT JOIN public.tenants t ON t.id = p.tenant_id
      WHERE p.id = _athlete_id
        AND (
          t.owner_user_id = _caller
          OR has_role(_caller, 'coach'::app_role, p.tenant_id)
        )
    );
$$;

DROP POLICY IF EXISTS avatars_insert_owner_or_staff ON storage.objects;
DROP POLICY IF EXISTS avatars_update_owner_or_staff ON storage.objects;
DROP POLICY IF EXISTS avatars_delete_owner_or_staff ON storage.objects;

CREATE POLICY avatars_insert_owner_or_staff ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND public.can_manage_athlete_avatar(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY avatars_update_owner_or_staff ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND public.can_manage_athlete_avatar(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY avatars_delete_owner_or_staff ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND public.can_manage_athlete_avatar(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
