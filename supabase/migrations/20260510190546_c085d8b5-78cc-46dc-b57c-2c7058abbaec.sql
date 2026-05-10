-- Primeiro, garantimos que todos os buckets públicos tenham política de visualização pública
-- Pois mesmo buckets públicos no Supabase precisam de política SELECT se o RLS estiver ativo na tabela storage.objects

CREATE POLICY "Acesso público de visualização para avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Acesso público de visualização para branding"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "Acesso público de visualização para coaches"
ON storage.objects FOR SELECT
USING (bucket_id = 'coaches');

CREATE POLICY "Acesso público de visualização para comunidade_uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'comunidade_uploads');

CREATE POLICY "Acesso público de visualização para vlog_videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'vlog_videos');

-- Agora, vamos refinar as políticas de INSERT para evitar o erro de "violação"
-- Removemos as antigas para garantir que as novas funcionem sem conflitos

DROP POLICY IF EXISTS "avatars_insert_owner_or_staff" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_owner_or_staff" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_owner_or_staff" ON storage.objects;

CREATE POLICY "Permitir upload de avatar próprio ou por staff"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND (
    -- O usuário está subindo para sua própria pasta (ID do usuário no primeiro segmento do caminho)
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Ou o usuário é um admin ou coach que tem permissão para gerenciar esse atleta
    can_manage_athlete_avatar(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);

CREATE POLICY "Permitir update de avatar próprio ou por staff"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    can_manage_athlete_avatar(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);

CREATE POLICY "Permitir delete de avatar próprio ou por staff"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    can_manage_athlete_avatar(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);

-- Refinando Branding (Upload de logo e fundo)
DROP POLICY IF EXISTS "branding_insert_owner_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "branding_update_owner_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "branding_delete_owner_or_admin" ON storage.objects;

CREATE POLICY "Permitir upload de branding por admin ou dono"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'branding' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR
    EXISTS (
      SELECT 1 FROM tenants t 
      WHERE t.id::text = (storage.foldername(name))[1]
      AND (t.owner_user_id = auth.uid() OR has_role(auth.uid(), 'coach'::app_role, t.id))
    )
  )
);

CREATE POLICY "Permitir update de branding por admin ou dono"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'branding' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR
    EXISTS (
      SELECT 1 FROM tenants t 
      WHERE t.id::text = (storage.foldername(name))[1]
      AND (t.owner_user_id = auth.uid() OR has_role(auth.uid(), 'coach'::app_role, t.id))
    )
  )
);

CREATE POLICY "Permitir delete de branding por admin ou dono"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'branding' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR
    EXISTS (
      SELECT 1 FROM tenants t 
      WHERE t.id::text = (storage.foldername(name))[1]
      AND (t.owner_user_id = auth.uid() OR has_role(auth.uid(), 'coach'::app_role, t.id))
    )
  )
);
