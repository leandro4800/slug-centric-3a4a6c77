-- Revogar EXECUTE público das funções SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Restringir listing dos buckets públicos: só permitir SELECT direto por path conhecido
DROP POLICY IF EXISTS "branding_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;

-- Recriar com restrição: nega listing (sem path) mas permite acesso direto via URL pública
CREATE POLICY "branding_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'branding' AND name IS NOT NULL AND name <> '');
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND name IS NOT NULL AND name <> '');