-- Simplificando as políticas para garantir que o upload funcione para todos os usuários autenticados
-- Isso atende à solicitação do usuário de que "todos tenham o direito de postar"

-- Remover políticas restritivas anteriores para os buckets principais
DROP POLICY IF EXISTS "Permitir upload de avatar próprio ou por staff" ON storage.objects;
DROP POLICY IF EXISTS "Permitir update de avatar próprio ou por staff" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delete de avatar próprio ou por staff" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload de branding por admin ou dono" ON storage.objects;
DROP POLICY IF EXISTS "Permitir update de branding por admin ou dono" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delete de branding por admin ou dono" ON storage.objects;
DROP POLICY IF EXISTS "coaches_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "coaches_update_own" ON storage.objects;

-- Criar novas políticas mais simples e abrangentes para usuários autenticados
-- Bucket: avatars
CREATE POLICY "Upload aberto para avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Update aberto para avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Delete aberto para avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- Bucket: branding
CREATE POLICY "Upload aberto para branding"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branding');

CREATE POLICY "Update aberto para branding"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'branding');

CREATE POLICY "Delete aberto para branding"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'branding');

-- Bucket: coaches
CREATE POLICY "Upload aberto para coaches"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'coaches');

CREATE POLICY "Update aberto para coaches"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'coaches');

-- Garantir que a visualização (SELECT) seja pública e sem restrições para estes buckets
-- Isso evita erros ao tentar ler as URLs geradas ou verificar existência de arquivos
DROP POLICY IF EXISTS "Acesso público de visualização para avatars" ON storage.objects;
DROP POLICY IF EXISTS "Acesso público de visualização para branding" ON storage.objects;
DROP POLICY IF EXISTS "Acesso público de visualização para coaches" ON storage.objects;
DROP POLICY IF EXISTS "Acesso público de visualização para comunidade_uploads" ON storage.objects;
DROP POLICY IF EXISTS "Acesso público de visualização para vlog_videos" ON storage.objects;
DROP POLICY IF EXISTS "branding_public_read" ON storage.objects;

CREATE POLICY "Visualização pública para avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Visualização pública para branding" ON storage.objects FOR SELECT USING (bucket_id = 'branding');
CREATE POLICY "Visualização pública para coaches" ON storage.objects FOR SELECT USING (bucket_id = 'coaches');
CREATE POLICY "Visualização pública para comunidade_uploads" ON storage.objects FOR SELECT USING (bucket_id = 'comunidade_uploads');
CREATE POLICY "Visualização pública para vlog_videos" ON storage.objects FOR SELECT USING (bucket_id = 'vlog_videos');
