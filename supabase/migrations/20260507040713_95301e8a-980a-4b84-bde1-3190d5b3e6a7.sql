
-- 1. Tighten storage INSERT policy for comunidade_uploads
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "comunidade_uploads_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'comunidade_uploads'
  AND auth.role() = 'authenticated'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 2. Revoke EXECUTE on SECURITY DEFINER helpers that should not be public
REVOKE EXECUTE ON FUNCTION public.email_is_registered(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.buscar_templates_treino(text, text, integer, text, text, uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_user_tenant() FROM anon, public;
